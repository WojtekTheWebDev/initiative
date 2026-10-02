import { describe, expect, it } from "vitest";
import type { Pos } from "@/lib/types";
import { PADDING, type ForceBox, type ForceLink, type ForceNode, relax } from "./force";

const dist = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);

/** Seeded generator (mulberry32), so test worlds are the same on every run. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A square box of half-size `r` around the node. */
const square = (r: number): ForceBox[] => [{ x: -r, y: -r, width: 2 * r, height: 2 * r }];
/** A square body of half-size `r` and a label `width` wide and 22 tall just below it, like a figure and its name tag. */
const figure = (r: number, width: number): ForceBox[] => [...square(r), { x: -width / 2, y: r + 4, width, height: 22 }];

/** Whether two nodes' boxes overlap where they ended. */
function overlapping(a: ForceNode, pa: Pos, b: ForceNode, pb: Pos): boolean {
  return a.boxes.some((p) =>
    b.boxes.some(
      (q) =>
        pa.x + p.x < pb.x + q.x + q.width &&
        pb.x + q.x < pa.x + p.x + p.width &&
        pa.y + p.y < pb.y + q.y + q.height &&
        pb.y + q.y < pa.y + p.y + p.height,
    ),
  );
}

/** A mixed scene: anchored, pinned and free nodes, figures with labels and links between them. */
function scene(): { nodes: ForceNode[]; links: ForceLink[] } {
  const nodes: ForceNode[] = [
    { id: "m1", boxes: figure(40, 80), start: { x: -300, y: 0 }, anchor: { pos: { x: -300, y: 0 }, strength: 0.03 } },
    { id: "m2", boxes: figure(30, 60), start: { x: 300, y: 0 }, anchor: { pos: { x: 300, y: 0 }, strength: 0.03 } },
    { id: "m3", boxes: square(20), start: { x: 0, y: 400 }, anchor: { pos: { x: 0, y: 400 }, strength: 0.03 } },
    { id: "rock", boxes: square(25), start: { x: 0, y: 0 }, pinned: true },
    { id: "h1", boxes: square(18), start: { x: 0, y: 5 } },
    { id: "h2", boxes: square(18), start: { x: 300, y: 0 } },
    { id: "h3", boxes: square(18), start: { x: 300, y: 0 } },
    { id: "idle", boxes: square(18), start: { x: 0, y: 200 }, anchor: { pos: { x: 0, y: 200 }, strength: 0.03 } },
  ];
  const links: ForceLink[] = [
    { source: "h1", target: "m1", length: 86, strength: 0.6 },
    { source: "h1", target: "m2", length: 118, strength: 0.2 },
    { source: "h2", target: "m2", length: 76, strength: 0.6 },
    { source: "h3", target: "m2", length: 76, strength: 0.6 },
    { source: "h3", target: "m3", length: 108, strength: 0.2 },
  ];
  return { nodes, links };
}

describe("relax", () => {
  it("gives exactly the same output for the same input", () => {
    const { nodes, links } = scene();
    expect(relax(nodes, links)).toEqual(relax(nodes, links));
  });

  it("barely depends on the order of nodes and links", () => {
    const { nodes, links } = scene();
    const a = relax(nodes, links);
    const b = relax([...nodes].reverse(), [...links].reverse());
    for (const node of nodes) {
      expect(dist(a.get(node.id)!, b.get(node.id)!)).toBeLessThan(1);
    }
  });

  it("returns every node, in input order", () => {
    const { nodes, links } = scene();
    expect([...relax(nodes, links).keys()]).toEqual(nodes.map((n) => n.id));
  });

  it("leaves a pinned node exactly at its start", () => {
    const { nodes, links } = scene();
    expect(relax(nodes, links).get("rock")).toEqual({ x: 0, y: 0 });
  });

  it("brings two linked free nodes to about `length` apart", () => {
    const nodes: ForceNode[] = [
      { id: "a", boxes: square(10), start: { x: 0, y: 0 } },
      { id: "b", boxes: square(10), start: { x: 400, y: 30 } },
    ];
    const out = relax(nodes, [{ source: "a", target: "b", length: 120, strength: 0.3 }]);
    expect(Math.abs(dist(out.get("a")!, out.get("b")!) - 120)).toBeLessThan(6);
  });

  it("pushes two linked nodes out to `length` when they start too close", () => {
    const nodes: ForceNode[] = [
      { id: "a", boxes: square(10), start: { x: 0, y: 0 } },
      { id: "b", boxes: square(10), start: { x: 0, y: 0 } },
    ];
    const out = relax(nodes, [{ source: "a", target: "b", length: 120, strength: 0.3 }]);
    expect(Math.abs(dist(out.get("a")!, out.get("b")!) - 120)).toBeLessThan(6);
  });

  it("puts a free node with only an anchor on its anchor", () => {
    const anchor = { x: 250, y: -80 };
    const out = relax([{ id: "a", boxes: square(20), start: { x: 100, y: 0 }, anchor: { pos: anchor, strength: 0.1 } }], []);
    expect(dist(out.get("a")!, anchor)).toBeLessThan(1);
  });

  it("brings a weakly anchored node all the way home from far away", () => {
    const home = { x: -40, y: 70 };
    const node: ForceNode = { id: "a", boxes: square(20), start: { x: 360, y: -230 }, anchor: { pos: home, strength: 0.03 } };
    expect(dist(relax([node], []).get("a")!, home)).toBeLessThan(1);
    // Cooling alone leaves it short: settling is what finishes the pull.
    expect(dist(relax([node], [], { settle: 0 }).get("a")!, home)).toBeGreaterThan(1);
  });

  it("settles a linked node and a weak anchor at their balance, not at the anchor", () => {
    // A pinned node pulls an anchored one with a spring of rest length 0, and
    // the anchor pulls it back: each step the spring moves it by 0.4 of the
    // gap to `pin`, the anchor by 0.03 of the gap to `home`.
    const nodes: ForceNode[] = [
      { id: "pin", boxes: square(1), start: { x: 0, y: 0 }, pinned: true },
      { id: "a", boxes: square(1), start: { x: 0, y: 0 }, anchor: { pos: { x: 500, y: 0 }, strength: 0.03 } },
    ];
    const out = relax(nodes, [{ source: "pin", target: "a", length: 0, strength: 0.4 }]);
    expect(out.get("a")!.x).toBeCloseTo((500 * 0.03) / (0.4 + 0.03), 0);
  });

  it("moves with its input: shifting every start and anchor shifts every output", () => {
    const { nodes, links } = scene();
    const dx = 1234.5;
    const dy = -987.25;
    const shift = (p: Pos) => ({ x: p.x + dx, y: p.y + dy });
    const moved = nodes.map((n) => ({
      ...n,
      start: shift(n.start),
      anchor: n.anchor && { ...n.anchor, pos: shift(n.anchor.pos) },
    }));
    const a = relax(nodes, links);
    const b = relax(moved, links);
    for (const node of nodes) {
      const p = a.get(node.id)!;
      const q = b.get(node.id)!;
      expect(Math.abs(q.x - p.x - dx)).toBeLessThan(0.5);
      expect(Math.abs(q.y - p.y - dy)).toBeLessThan(0.5);
    }
  });

  it("leaves no overlaps, even with every node started on one point", () => {
    const rand = seeded(42);
    const nodes: ForceNode[] = Array.from({ length: 40 }, (_, i) => ({
      id: `n${i}`,
      boxes: i % 2 ? square(10 + Math.floor(rand() * 30)) : figure(10 + Math.floor(rand() * 30), 40 + rand() * 80),
      start: { x: 50, y: 50 },
    }));
    const links: ForceLink[] = Array.from({ length: 20 }, () => {
      const a = Math.floor(rand() * 40);
      const b = (a + 1 + Math.floor(rand() * 39)) % 40;
      return { source: `n${a}`, target: `n${b}`, length: 20 + rand() * 80, strength: 0.2 + rand() * 0.6 };
    });
    const out = relax(nodes, links);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const [a, b] = [nodes[i], nodes[j]];
        expect(overlapping(a, out.get(a.id)!, b, out.get(b.id)!), `${a.id} and ${b.id}`).toBe(false);
      }
    }
  });

  it("separates nodes that sit on the same point along a direction set by their ids", () => {
    const nodes: ForceNode[] = [
      { id: "a", boxes: square(10), start: { x: 0, y: 0 } },
      { id: "b", boxes: square(10), start: { x: 0, y: 0 } },
    ];
    const one = relax(nodes, []);
    const two = relax([...nodes].reverse(), []);
    expect(one.get("a")!.x).toBeCloseTo(two.get("a")!.x, 9);
    expect(one.get("a")!.y).toBeCloseTo(two.get("a")!.y, 9);
    expect(dist(one.get("a")!, one.get("b")!)).toBeGreaterThanOrEqual(20);
  });

  it("pushes a free node off a pinned node's label, keeping PADDING between them", () => {
    const nodes: ForceNode[] = [
      { id: "monster", boxes: figure(40, 120), start: { x: 0, y: 0 }, pinned: true },
      { id: "hero", boxes: square(18), start: { x: 10, y: 55 } },
    ];
    const out = relax(nodes, []);
    const hero = out.get("hero")!;
    expect(overlapping(nodes[0], out.get("monster")!, nodes[1], hero)).toBe(false);
    // At least PADDING apart: grown by a little less than that, the hero still clears the label.
    const grown = { ...nodes[1], boxes: square(18 + PADDING - 0.01) };
    expect(overlapping(nodes[0], out.get("monster")!, grown, hero)).toBe(false);
  });

  it("prefers pushing nodes apart sideways when asked to", () => {
    // b starts below a, a little off to the right; a plain relax moves it down, a sideways one to the right.
    const nodes: ForceNode[] = [
      { id: "a", boxes: square(20), start: { x: 0, y: 0 }, pinned: true },
      { id: "b", boxes: square(20), start: { x: 4, y: 12 } },
    ];
    const plain = relax(nodes, []).get("b")!;
    const sideways = relax(nodes, [], { sideways: 4 }).get("b")!;
    expect(plain.x).toBeCloseTo(4);
    expect(sideways.y).toBeCloseTo(12);
    expect(sideways.x).toBeGreaterThan(40);
  });

  it("relaxes 80 nodes and 120 links in under 15 ms", () => {
    const rand = seeded(7);
    const nodes: ForceNode[] = Array.from({ length: 80 }, (_, i) => {
      const start = { x: rand() * 2000 - 1000, y: rand() * 2000 - 1000 };
      return i < 40
        ? { id: `m${i}`, boxes: figure(30, 80), start, anchor: { pos: start, strength: 0.03 } }
        : { id: `h${i}`, boxes: square(18), start };
    });
    const links: ForceLink[] = Array.from({ length: 120 }, (_, i) => ({
      source: `h${40 + (i % 40)}`,
      target: `m${Math.floor(rand() * 40)}`,
      length: 76,
      strength: i < 40 ? 0.6 : 0.2,
    }));
    relax(nodes, links);
    const times: number[] = [];
    for (let run = 0; run < 7; run++) {
      const t0 = performance.now();
      relax(nodes, links);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[3]).toBeLessThan(15);
  });
});
