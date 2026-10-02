import { describe, expect, it } from "vitest";
import type { Hero, Pos, World } from "@/lib/types";
import { GHOST_RADIUS, LABEL_WEDGE, arcPositions, layoutWorld, openingPoints } from "./layout";
import { HERO_BASE_RADIUS, monsterBaseRadius } from "./rings";

function world(): World {
  return {
    monsters: [
      { id: "m1", name: "One", size: "XL", pos: { x: -400, y: 100 } },
      { id: "m2", name: "Two", size: "M", pos: { x: -100, y: -100 } },
      { id: "m3", name: "Three", size: "S", pos: { x: 300, y: 0 } },
      { id: "dead", name: "Dead", size: "L", pos: { x: 0, y: 500 }, slain: "2026-09-01" },
    ],
    heroes: [
      { id: "cid", name: "Cid", class: "rogue", targets: ["m1"] },
      { id: "ana", name: "Ana", class: "archer", targets: ["m1", "m2"] },
      { id: "bob", name: "Bob", class: "mage", targets: [], pos: { x: 10, y: 20 } },
    ],
  };
}

const dist = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);
/** Angle of `p` around `c` measured from straight down, in [0, π]. */
const fromBottom = (c: Pos, p: Pos) => Math.abs(Math.atan2(p.x - c.x, p.y - c.y));

function crowd(main: number, ghosts: number): World {
  const heroes: Hero[] = [];
  for (let i = 0; i < main; i++) {
    heroes.push({ id: `h${String(i).padStart(2, "0")}`, name: "H", class: "mage", targets: ["m"] });
  }
  for (let i = 0; i < ghosts; i++) {
    heroes.push({ id: `g${String(i).padStart(2, "0")}`, name: "G", class: "rogue", targets: ["other", "m"] });
  }
  return {
    monsters: [
      { id: "m", name: "M", size: "S", pos: { x: 50, y: 50 } },
      { id: "other", name: "O", size: "M", pos: { x: 5000, y: 0 } },
    ],
    heroes,
  };
}

describe("arcPositions", () => {
  it("puts a single figure straight above the center", () => {
    const [p] = arcPositions({ x: 10, y: 10 }, 1, 50, 20);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(-40);
  });
  it("fans out symmetrically, left to right, neighbours `chord` apart", () => {
    const ps = arcPositions({ x: 0, y: 0 }, 3, 100, 40);
    expect(ps[0].x).toBeCloseTo(-ps[2].x);
    expect(ps[0].y).toBeCloseTo(ps[2].y);
    expect(ps[1].x).toBeCloseTo(0);
    expect(ps[0].x).toBeLessThan(0);
    expect(dist(ps[0], ps[1])).toBeCloseTo(40);
    expect(dist(ps[1], ps[2])).toBeCloseTo(40);
  });
});

describe("layoutWorld", () => {
  it("excludes slain monsters", () => {
    const ids = layoutWorld(world()).monsters.map((m) => m.monster.id);
    expect(ids).toEqual(["m1", "m2", "m3"]);
  });

  it("flags unfought monsters (ghost targets count as fought)", () => {
    const flags = Object.fromEntries(
      layoutWorld(world()).monsters.map((m) => [m.monster.id, m.unfought]),
    );
    expect(flags).toEqual({ m1: false, m2: false, m3: true });
  });

  it("gives each monster its base radius", () => {
    const [m1] = layoutWorld(world()).monsters;
    expect(m1.radius).toBe(monsterBaseRadius("XL"));
  });

  it("keeps idle heroes at their pos", () => {
    const bob = layoutWorld(world()).heroes.find((h) => h.hero.id === "bob")!;
    expect(bob.pos).toEqual({ x: 10, y: 20 });
    expect(bob.mainTarget).toBeNull();
  });

  it("rings engaged heroes around their main target in hero-id order, left to right", () => {
    const { heroes } = layoutWorld(world());
    const ana = heroes.find((h) => h.hero.id === "ana")!;
    const cid = heroes.find((h) => h.hero.id === "cid")!;
    expect(ana.mainTarget).toBe("m1");
    expect(cid.mainTarget).toBe("m1");
    const c = { x: -400, y: 100 };
    expect(dist(ana.pos, c)).toBeCloseTo(dist(cid.pos, c));
    expect(ana.pos.x).toBeLessThan(cid.pos.x);
    // Both above the monster.
    expect(ana.pos.y).toBeLessThan(c.y);
    expect(cid.pos.y).toBeLessThan(c.y);
  });

  it("does not depend on the order heroes appear in the file", () => {
    const w = world();
    const flipped = { ...w, heroes: [...w.heroes].reverse() };
    const pos = (l: ReturnType<typeof layoutWorld>) =>
      Object.fromEntries(l.heroes.map((h) => [h.hero.id, h.pos]));
    expect(pos(layoutWorld(flipped))).toEqual(pos(layoutWorld(w)));
  });

  it("moves the ring with the monster", () => {
    const a = layoutWorld(world()).heroes.find((h) => h.hero.id === "ana")!.pos;
    const w = world();
    w.monsters[0] = { ...w.monsters[0], pos: { x: -300, y: 150 } };
    const b = layoutWorld(w).heroes.find((h) => h.hero.id === "ana")!.pos;
    expect(b.x - a.x).toBeCloseTo(100);
    expect(b.y - a.y).toBeCloseTo(50);
  });

  it("places a ghost near each secondary target", () => {
    const { ghosts } = layoutWorld(world());
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].hero.id).toBe("ana");
    expect(ghosts[0].monsterId).toBe("m2");
    const m2 = { x: -100, y: -100 };
    const d = dist(ghosts[0].pos, m2);
    expect(d).toBeGreaterThan(monsterBaseRadius("M") + GHOST_RADIUS);
    expect(d).toBeLessThan(monsterBaseRadius("M") + 60);
  });

  it("skips targets that point at slain or missing monsters", () => {
    const w = world();
    w.heroes.push({ id: "dan", name: "Dan", class: "monk", targets: ["dead", "nope", "m3"] });
    w.heroes.push({ id: "eve", name: "Eve", class: "monk", targets: ["dead"] });
    const l = layoutWorld(w);
    expect(l.heroes.find((h) => h.hero.id === "dan")!.mainTarget).toBe("m3");
    expect(l.heroes.find((h) => h.hero.id === "eve")!.mainTarget).toBeNull();
    expect(l.ghosts.every((g) => g.monsterId !== "dead")).toBe(true);
    expect(l.monsters.find((m) => m.monster.id === "m3")!.unfought).toBe(false);
  });

  it.each([
    [1, 0],
    [2, 1],
    [5, 3],
    [12, 9],
    [0, 4],
  ])("with %i fighters and %i ghosts nothing overlaps and the label wedge stays clear", (main, ghostCount) => {
    const l = layoutWorld(crowd(main, ghostCount));
    const c = { x: 50, y: 50 };
    const base = monsterBaseRadius("S");
    const ring = l.heroes.filter((h) => h.mainTarget === "m").map((h) => h.pos);
    const ghosts = l.ghosts.filter((g) => g.monsterId === "m").map((g) => g.pos);
    expect(ring).toHaveLength(main);
    expect(ghosts).toHaveLength(ghostCount);

    const figures = [
      ...ring.map((p) => ({ p, r: HERO_BASE_RADIUS })),
      ...ghosts.map((p) => ({ p, r: GHOST_RADIUS })),
    ];
    for (let i = 0; i < figures.length; i++) {
      const a = figures[i];
      expect(dist(a.p, c)).toBeGreaterThan(base + a.r);
      expect(fromBottom(c, a.p)).toBeGreaterThanOrEqual(LABEL_WEDGE / 2 - 1e-9);
      for (let j = i + 1; j < figures.length; j++) {
        const b = figures[j];
        expect(dist(a.p, b.p)).toBeGreaterThanOrEqual(a.r + b.r - 1e-9);
      }
    }
  });
});

describe("openingPoints", () => {
  it("covers living monsters and every hero", () => {
    const l = layoutWorld(world());
    expect(openingPoints(l)).toHaveLength(3 + 3);
  });
});
