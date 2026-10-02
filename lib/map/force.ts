import type { Pos } from "@/lib/types";

/*
 * A small force-directed solver in the style of d3-force, written by hand.
 * It knows nothing about heroes or monsters: callers map their figures onto
 * nodes and links, and read back where every node settled.
 *
 * Each iteration works out every push and pull from the positions at the
 * start of that iteration and only then moves the nodes, so the result does
 * not depend on the order of the input beyond floating-point rounding. Every
 * force works on differences between positions, so moving every `start` and
 * `anchor` by the same offset moves the whole result by that offset.
 *
 * Pure and deterministic: no randomness, no clock.
 */

export type ForceNode = {
  id: string;
  /** Collision radius. The solver adds PADDING between neighbours. */
  radius: number;
  /** Where the node starts. */
  start: Pos;
  /** Never moves: stays at `start`. */
  pinned?: boolean;
  /** A spring toward a home point. */
  anchor?: { pos: Pos; strength: number };
  /** A box below the node (e.g. a monster's name label) that other nodes are pushed out of. */
  keepOut?: { width: number; height: number; gap: number };
};

/** A spring between two nodes that pulls or pushes them toward `length` apart. */
export type ForceLink = { source: string; target: string; length: number; strength: number };

export type RelaxOptions = {
  /** Number of simulation steps (default DEFAULT_ITERATIONS). */
  iterations?: number;
};

/** Space added between two colliding circles. */
export const PADDING = 10;
export const DEFAULT_ITERATIONS = 300;
/** `alpha` decays geometrically from 1 to this over the iterations. */
export const ALPHA_MIN = 0.001;
/** Share of a node's velocity kept from one step to the next. */
export const DAMPING = 0.6;
/** Share of an overlap removed per step during the simulation. */
const COLLIDE_STRENGTH = 0.5;
/** Upper bound on the collision-only passes run after the simulation. */
const FINAL_PASSES = 60;
/** Overlaps smaller than this (in world units) count as resolved. */
const EPSILON = 1e-6;

/** Pure and deterministic. Returns the final position of every node. */
export function relax(nodes: ForceNode[], links: ForceLink[], opts: RelaxOptions = {}): Map<string, Pos> {
  const n = nodes.length;
  const iterations = Math.max(0, Math.floor(opts.iterations ?? DEFAULT_ITERATIONS));

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

  const radius = Float64Array.from(nodes, (node) => node.radius);
  const springs: { a: number; b: number; length: number; strength: number }[] = [];
  for (const link of links) {
    const a = index.get(link.source);
    const b = index.get(link.target);
    if (a === undefined || b === undefined || a === b) continue;
    springs.push({ a, b, length: link.length, strength: link.strength });
  }
  const boxes: { owner: number; width: number; height: number; gap: number }[] = [];
  nodes.forEach((node, owner) => {
    if (node.keepOut) boxes.push({ owner, ...node.keepOut });
  });
  const tie = { x: 0, y: 0 };

  /** Adds (dx, dy) to the gap between a and b: a moves by -d, b by +d, split unless one is pinned. */
  const separate = (a: number, b: number, dx: number, dy: number) => {
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

  // Node indices sorted by x, so collisions only look at nodes whose x is close.
  // Kept between steps: nodes move little per step, so insertion sort is cheap.
  const order = Int32Array.from(nodes, (_, i) => i);
  const maxRadius = radius.reduce((m, r) => Math.max(m, r), 0);
  const sortByX = () => {
    for (let i = 1; i < n; i++) {
      const k = order[i];
      const kx = x[k];
      let j = i - 1;
      while (j >= 0 && x[order[j]] > kx) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = k;
    }
  };

  /** Pushes overlapping circles and keep-out boxes apart, `strength` of the overlap each. */
  const collide = (strength: number): boolean => {
    let overlapped = false;
    sortByX();
    for (let i = 0; i < n; i++) {
      const a = order[i];
      const ax = x[a];
      const ay = y[a];
      const ar = radius[a] + PADDING;
      const reach = ax + ar + maxRadius;
      for (let j = i + 1; j < n; j++) {
        const b = order[j];
        if (x[b] >= reach) break;
        const min = ar + radius[b];
        const dx = x[b] - ax;
        const dy = y[b] - ay;
        if (dx >= min || dy >= min || dy <= -min) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const dist = Math.sqrt(d2);
        if (min - dist <= EPSILON) continue;
        overlapped = true;
        const push = (min - dist) * strength;
        if (dist > 0) {
          separate(a, b, (dx / dist) * push, (dy / dist) * push);
        } else {
          tieBreak(nodes[a].id, nodes[b].id, tie);
          separate(a, b, tie.x * push, tie.y * push);
        }
      }
    }
    for (const box of boxes) {
      const a = box.owner;
      // The box grown by each other node's radius; the node leaves through the nearest side.
      const cx = x[a];
      const half = box.width / 2;
      const top = y[a] + radius[a] + box.gap;
      const bottom = top + box.height;
      const from = cx - half - maxRadius;
      const to = cx + half + maxRadius;
      // First node in x order at or right of `from`.
      let lo = 0;
      let hi = n;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (x[order[mid]] < from) lo = mid + 1;
        else hi = mid;
      }
      for (let j = lo; j < n; j++) {
        const b = order[j];
        if (x[b] > to) break;
        if (b === a) continue;
        const r = radius[b];
        const toUpper = y[b] - (top - r);
        if (toUpper <= EPSILON) continue;
        const toLower = bottom + r - y[b];
        if (toLower <= EPSILON) continue;
        const toLeft = x[b] - (cx - half - r);
        if (toLeft <= EPSILON) continue;
        const toRight = cx + half + r - x[b];
        if (toRight <= EPSILON) continue;
        overlapped = true;
        const least = Math.min(toLeft, toRight, toUpper, toLower);
        const push = least * strength;
        if (least === toUpper) separate(a, b, 0, -push);
        else if (least === toLower) separate(a, b, 0, push);
        else if (least === toLeft) separate(a, b, -push, 0);
        else separate(a, b, push, 0);
      }
    }
    return overlapped;
  };

  const clearForces = () => {
    fx.fill(0);
    fy.fill(0);
  };

  for (let step = 0; step < iterations; step++) {
    const alpha = iterations === 1 ? 1 : Math.pow(ALPHA_MIN, step / (iterations - 1));
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

    collide(COLLIDE_STRENGTH);

    for (let i = 0; i < n; i++) {
      if (pinned[i]) continue;
      vx[i] = (vx[i] + fx[i]) * DAMPING;
      vy[i] = (vy[i] + fy[i]) * DAMPING;
      x[i] += vx[i];
      y[i] += vy[i];
    }
  }

  // Collision-only passes at full strength, so springs that fight collisions
  // never leave an overlap behind.
  for (let pass = 0; pass < FINAL_PASSES; pass++) {
    clearForces();
    if (!collide(1)) break;
    for (let i = 0; i < n; i++) {
      if (pinned[i]) continue;
      x[i] += fx[i];
      y[i] += fy[i];
    }
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
  const angle = (hash(`${lo}\u0000${hi}`) / 0x100000000) * 2 * Math.PI;
  const sign = a < b ? 1 : -1;
  out.x = Math.cos(angle) * sign;
  out.y = Math.sin(angle) * sign;
}

/** FNV-1a, 32 bits. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
