import type { Pos } from "@/lib/types";

/*
 * A small force-directed solver in the style of d3-force, written by hand.
 * It knows nothing about heroes or monsters: callers map their figures onto
 * nodes and links, and read back where every node settled.
 *
 * A relax runs in three stages:
 * 1. Cooling: `iterations` steps while `alpha`, the scale of every spring and
 *    anchor, decays from 1 to ALPHA_MIN, so the picture forms without jitter.
 * 2. Settling: steps at alpha SETTLE_ALPHA until no node moves more than
 *    SETTLE_EPSILON in a step (at most `settle` steps). Weak anchors only pull
 *    their nodes all the way home once they act at full strength for a while.
 *    Springs and anchors scale together, so this changes how close the result
 *    gets to its balance, never where that balance is.
 * 3. Collision-only passes, so no boxes overlap even where springs fight
 *    collisions. These keep only PADDING: a link's `clearance` is a wish the
 *    simulation works toward, not a promise.
 *
 * Each step works out every push and pull from the positions at the start of
 * that step and only then moves the nodes, so the result does not depend on
 * the order of the input beyond floating-point rounding. Every force works on
 * differences between positions, so moving every `start` and `anchor` by the
 * same offset moves the whole result by that offset.
 *
 * Pure and deterministic: no randomness, no clock.
 */

/** A box that moves with its node: its top-left corner is `(x, y)` from the node's position. */
export type ForceBox = { x: number; y: number; width: number; height: number };

export type ForceNode = {
  id: string;
  /**
   * The area the node covers (for a figure: its body and its name tag). No
   * box of one node overlaps a box of another; the solver keeps PADDING
   * between them. A node with no boxes collides with nothing.
   */
  boxes: ForceBox[];
  /** Where the node starts. */
  start: Pos;
  /** Never moves: stays at `start`. */
  pinned?: boolean;
  /** A spring toward a home point. */
  anchor?: { pos: Pos; strength: number };
};

/** A spring between two nodes that pulls or pushes them toward `length` apart. */
export type ForceLink = {
  source: string;
  target: string;
  length: number;
  strength: number;
  /** Space kept between the boxes of the two nodes, when it should be more than PADDING (e.g. room for an arrow between them). */
  clearance?: number;
};

export type RelaxOptions = {
  /** Number of cooling steps (default DEFAULT_ITERATIONS). */
  iterations?: number;
  /** Most settling steps (default DEFAULT_SETTLE). Settling stops early once nothing moves. */
  settle?: number;
  /**
   * How much more pushing two overlapping boxes apart up or down costs than
   * pushing them sideways (default 1). Each overlap is undone along the
   * cheaper direction, so above 1 nodes settle side by side more often.
   */
  sideways?: number;
};

/** Space kept between the boxes of two nodes. */
export const PADDING = 8;
export const DEFAULT_ITERATIONS = 300;
/** `alpha` decays geometrically from 1 to this over the iterations. */
export const ALPHA_MIN = 0.001;
/** Share of a node's velocity kept from one step to the next. */
export const DAMPING = 0.6;
/** Upper bound on the settling steps run after cooling. */
export const DEFAULT_SETTLE = 200;
/** `alpha` while settling. */
export const SETTLE_ALPHA = 1;
/** Settling stops once no node moves more than this (in world units) in one step. */
export const SETTLE_EPSILON = 0.01;
/** Share of an overlap removed per step during the simulation. */
const COLLIDE_STRENGTH = 0.5;
/** Upper bound on the collision-only passes run after the simulation. */
const FINAL_PASSES = 60;
/** Overlaps smaller than this (in world units) count as resolved. */
const EPSILON = 0.01;

/** Pure and deterministic. Returns the final position of every node. */
export function relax(nodes: ForceNode[], links: ForceLink[], opts: RelaxOptions = {}): Map<string, Pos> {
  const n = nodes.length;
  const iterations = Math.max(0, Math.floor(opts.iterations ?? DEFAULT_ITERATIONS));
  const settle = Math.max(0, Math.floor(opts.settle ?? DEFAULT_SETTLE));
  const sideways = opts.sideways ?? 1;

  const index = new Map<string, number>();
  nodes.forEach((node, i) => index.set(node.id, i));

  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  // Per-step pushes and pulls, applied after every force has been worked out.
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const pinned = nodes.map((node) => node.pinned === true);
  nodes.forEach((node, i) => {
    x[i] = node.start.x;
    y[i] = node.start.y;
  });

  const springs: { a: number; b: number; length: number; strength: number }[] = [];
  for (const link of links) {
    const a = index.get(link.source);
    const b = index.get(link.target);
    if (a === undefined || b === undefined || a === b) continue;
    springs.push({ a, b, length: link.length, strength: link.strength });
  }
  // Space kept between the boxes of linked nodes, by pair (lower index * n + higher index).
  const clearance = new Map<number, number>();
  let widest = PADDING;
  for (const link of links) {
    const a = index.get(link.source);
    const b = index.get(link.target);
    if (a === undefined || b === undefined || a === b || !link.clearance) continue;
    const key = Math.min(a, b) * n + Math.max(a, b);
    clearance.set(key, Math.max(clearance.get(key) ?? PADDING, link.clearance));
    widest = Math.max(widest, link.clearance);
  }
  const tie = { x: 0, y: 0 };

  // Every node's boxes in one list (node i owns boxes first[i] to first[i + 1] - 1),
  // and how far from the node its boxes reach on each side.
  const first = new Int32Array(n + 1);
  const boxes: ForceBox[] = [];
  const left = new Float64Array(n);
  const right = new Float64Array(n);
  const top = new Float64Array(n);
  const bottom = new Float64Array(n);
  nodes.forEach((node, i) => {
    first[i] = boxes.length;
    left[i] = top[i] = Infinity;
    right[i] = bottom[i] = -Infinity;
    for (const b of node.boxes) {
      boxes.push(b);
      left[i] = Math.min(left[i], b.x);
      right[i] = Math.max(right[i], b.x + b.width);
      top[i] = Math.min(top[i], b.y);
      bottom[i] = Math.max(bottom[i], b.y + b.height);
    }
  });
  first[n] = boxes.length;

  /** While set, pushes move nodes at once instead of adding up for the end of the step (see the final passes). */
  let direct = false;

  /** Adds (dx, dy) to the gap between a and b: a moves by -d, b by +d, split unless one is pinned. */
  const separate = (a: number, b: number, dx: number, dy: number) => {
    if (direct) {
      const share = pinned[a] ? 0 : pinned[b] ? 1 : 0.5;
      if (pinned[a] && pinned[b]) return;
      x[a] -= dx * share;
      y[a] -= dy * share;
      x[b] += dx * (1 - share);
      y[b] += dy * (1 - share);
      return;
    }
    if (pinned[a]) {
      if (pinned[b]) return;
      fx[b] += dx;
      fy[b] += dy;
    } else if (pinned[b]) {
      fx[a] -= dx;
      fy[a] -= dy;
    } else {
      fx[a] -= dx / 2;
      fy[a] -= dy / 2;
      fx[b] += dx / 2;
      fy[b] += dy / 2;
    }
  };

  /** A fixed direction (+1 or -1) along one axis for b leaving a, when their positions can't tell. */
  const tieSign = (a: number, b: number, alongX: boolean) => {
    tieBreak(nodes[a].id, nodes[b].id, tie);
    return (alongX ? tie.x : tie.y) < 0 ? -1 : 1;
  };

  // Nodes that have boxes, sorted by where their boxes start on the left, so
  // collisions only look at nodes that are close along x. Kept between steps:
  // nodes move little per step, so insertion sort is cheap.
  const order = Int32Array.from(nodes.flatMap((node, i) => (node.boxes.length > 0 ? [i] : [])));
  const m = order.length;
  const sortByLeft = () => {
    for (let i = 1; i < m; i++) {
      const k = order[i];
      const kx = x[k] + left[k];
      let j = i - 1;
      while (j >= 0 && x[order[j]] + left[order[j]] > kx) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = k;
    }
  };

  /**
   * Pushes apart every two nodes whose boxes overlap (PADDING counts as
   * overlap, and with `roomy` so does a link's `clearance`): `strength` of the
   * shortest move right, left, down or up that clears all their boxes (see
   * `sideways`). Returns whether anything overlapped.
   */
  const collide = (strength: number, roomy: boolean): boolean => {
    let overlapped = false;
    sortByLeft();
    const reachPad = roomy ? widest : PADDING;
    for (let i = 0; i < m; i++) {
      const a = order[i];
      const reach = x[a] + right[a] + reachPad;
      for (let j = i + 1; j < m; j++) {
        const b = order[j];
        const bx = x[b];
        if (bx + left[b] >= reach) break;
        // Read here, not once per a: with `direct`, earlier pushes have already moved it.
        const ax = x[a];
        const ay = y[a];
        const by = y[b];
        if (by + top[b] >= ay + bottom[a] + reachPad || by + bottom[b] <= ay + top[a] - reachPad) continue;
        const pad = roomy && clearance.size ? (clearance.get(Math.min(a, b) * n + Math.max(a, b)) ?? PADDING) : PADDING;
        // How far b would have to move right, left, down or up (relative to a)
        // for none of their boxes to overlap. Each counts every box pair in
        // the way, not only the ones that overlap now, so a push never just
        // trades one overlap for another between the same two nodes.
        let touching = false;
        let rightward = 0;
        let leftward = 0;
        let down = 0;
        let up = 0;
        for (let p = first[a]; p < first[a + 1]; p++) {
          const pa = boxes[p];
          const a0 = ax + pa.x;
          const a1 = a0 + pa.width;
          const a2 = ay + pa.y;
          const a3 = a2 + pa.height;
          for (let q = first[b]; q < first[b + 1]; q++) {
            const qb = boxes[q];
            const b0 = bx + qb.x;
            const b1 = b0 + qb.width;
            const b2 = by + qb.y;
            const b3 = b2 + qb.height;
            const ox = Math.min(a1, b1) - Math.max(a0, b0) + pad;
            const oy = Math.min(a3, b3) - Math.max(a2, b2) + pad;
            if (oy > EPSILON) {
              rightward = Math.max(rightward, a1 - b0 + pad);
              leftward = Math.max(leftward, b1 - a0 + pad);
            }
            if (ox > EPSILON) {
              down = Math.max(down, a3 - b2 + pad);
              up = Math.max(up, b3 - a2 + pad);
            }
            if (ox > EPSILON && oy > EPSILON) touching = true;
          }
        }
        if (!touching) continue;
        overlapped = true;
        // The cheapest way out, with up and down costing `sideways` times
        // more. When both ways along an axis cost the same, the nodes'
        // positions decide, and then their ids.
        const alongX = Math.min(rightward, leftward) <= Math.min(down, up) * sideways;
        if (alongX) {
          const sign = rightward !== leftward ? (rightward < leftward ? 1 : -1) : bx !== ax ? Math.sign(bx - ax) : tieSign(a, b, true);
          separate(a, b, sign * Math.min(rightward, leftward) * strength, 0);
        } else {
          const sign = down !== up ? (down < up ? 1 : -1) : by !== ay ? Math.sign(by - ay) : tieSign(a, b, false);
          separate(a, b, 0, sign * Math.min(down, up) * strength);
        }
      }
    }
    return overlapped;
  };

  const clearForces = () => {
    fx.fill(0);
    fy.fill(0);
  };

  /** One simulation step with springs and anchors scaled by `alpha`. Returns the largest distance a node moved. */
  const step = (alpha: number): number => {
    clearForces();

    for (const s of springs) {
      const dx = x[s.b] - x[s.a];
      const dy = y[s.b] - y[s.a];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pull = (s.length - dist) * s.strength * alpha;
      if (dist > 0) {
        separate(s.a, s.b, (dx / dist) * pull, (dy / dist) * pull);
      } else {
        tieBreak(nodes[s.a].id, nodes[s.b].id, tie);
        separate(s.a, s.b, tie.x * pull, tie.y * pull);
      }
    }

    nodes.forEach((node, i) => {
      if (!node.anchor || pinned[i]) return;
      fx[i] += (node.anchor.pos.x - x[i]) * node.anchor.strength * alpha;
      fy[i] += (node.anchor.pos.y - y[i]) * node.anchor.strength * alpha;
    });

    collide(COLLIDE_STRENGTH, true);

    let moved = 0;
    for (let i = 0; i < n; i++) {
      if (pinned[i]) continue;
      vx[i] = (vx[i] + fx[i]) * DAMPING;
      vy[i] = (vy[i] + fy[i]) * DAMPING;
      x[i] += vx[i];
      y[i] += vy[i];
      moved = Math.max(moved, vx[i] * vx[i] + vy[i] * vy[i]);
    }
    return Math.sqrt(moved);
  };

  for (let i = 0; i < iterations; i++) {
    step(iterations === 1 ? 1 : Math.pow(ALPHA_MIN, i / (iterations - 1)));
  }
  for (let i = 0; i < settle; i++) {
    if (step(SETTLE_ALPHA) <= SETTLE_EPSILON) break;
  }

  // Collision-only passes at full strength, so springs that fight collisions
  // never leave an overlap behind. Each push moves its two nodes at once, so a
  // node squeezed from both sides is not held still by pushes that cancel out.
  // Clearances are left out here, so a crowd always settles.
  direct = true;
  for (let pass = 0; pass < FINAL_PASSES; pass++) {
    if (!collide(1, false)) break;
  }

  const result = new Map<string, Pos>();
  nodes.forEach((node, i) => result.set(node.id, { x: x[i], y: y[i] }));
  return result;
}

/**
 * Writes into `out` a fixed unit vector from node `a` to node `b`, used when the
 * two sit on the same point. Swapping `a` and `b` flips it.
 */
function tieBreak(a: string, b: string, out: Pos): void {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const angle = (fnv1a(`${lo}\u0000${hi}`) / 0x100000000) * 2 * Math.PI;
  const sign = a < b ? 1 : -1;
  out.x = Math.cos(angle) * sign;
  out.y = Math.sin(angle) * sign;
}

/** FNV-1a, 32 bits: a stable hash for picking directions from ids. */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
