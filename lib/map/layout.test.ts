import { describe, expect, it } from "vitest";
import type { Hero, Monster, Pos, Size, World } from "@/lib/types";
import { MAIN_GAP, TAG_ROOM_SCALE, heroShape, layoutWorld, monsterShape, openingPoints, shownTags, type WorldLayout } from "./layout";
import { miniBodyRect, monsterMini, type Rect } from "./minis";
import { MONSTER_TAG_FONT, tagRect } from "./tags";
import { BASE_SQUASH, HERO_BASE_RADIUS, monsterBaseRadius } from "./rings";

const dist = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);
const monsterAt = (l: WorldLayout, id: string) => l.monsters.find((m) => m.monster.id === id)!.pos;
const heroAt = (l: WorldLayout, id: string) => l.heroes.find((h) => h.hero.id === id)!.pos;
const centre = (ps: Pos[]) => ({
  x: ps.reduce((s, p) => s + p.x, 0) / ps.length,
  y: ps.reduce((s, p) => s + p.y, 0) / ps.length,
});

const monster = (id: string, size: Size, x: number, y: number, extra: Partial<Monster> = {}): Monster => ({
  id,
  name: id.toUpperCase(),
  size,
  pos: { x, y },
  ...extra,
});
const hero = (id: string, targets: string[], pos?: Pos): Hero => ({
  id,
  name: id.toUpperCase(),
  class: "mage",
  targets,
  ...(pos ? { pos } : {}),
});

function world(): World {
  return {
    monsters: [
      monster("m1", "XL", -400, 100),
      monster("m2", "M", -100, -100),
      monster("m3", "S", 300, 0),
      monster("dead", "L", 0, 500, { slain: "2026-09-01" }),
    ],
    heroes: [hero("cid", ["m1"]), hero("ana", ["m1", "m2"]), hero("bob", [], { x: 10, y: 20 })],
  };
}

/** The user's example: H1 targets [M1, M2], H2 targets [M2]. */
function example(): World {
  return {
    monsters: [monster("M1", "L", -600, 0), monster("M2", "L", 600, 0)],
    heroes: [hero("H1", ["M1", "M2"]), hero("H2", ["M2"])],
  };
}

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

/** `monsters` monsters and `heroes` heroes with 1 to 3 targets each, scattered over a 2400 x 1600 field. */
function crowd(monsters: number, heroes: number, seed = 1): World {
  const rand = seeded(seed);
  const sizes: Size[] = ["S", "M", "L", "XL"];
  const ms = Array.from({ length: monsters }, (_, i) =>
    monster(`m${i}`, sizes[i % 4], Math.round(rand() * 2400 - 1200), Math.round(rand() * 1600 - 800), {
      name: `Monster number ${i}`,
    }),
  );
  const hs = Array.from({ length: heroes }, (_, i) => {
    const count = 1 + Math.floor(rand() * 3);
    return hero(`h${i}`, Array.from({ length: count }, () => `m${Math.floor(rand() * monsters)}`));
  });
  return { monsters: ms, heroes: hs };
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** No figure's mini (with its base) or name tag covers another figure's mini or tag. */
function expectNoOverlaps(l: WorldLayout) {
  const figures = [
    ...l.monsters.map((m) => ({ id: m.monster.id, shape: monsterShape(m) })),
    ...l.heroes.map((h) => ({ id: h.hero.id, shape: heroShape(h) })),
  ];
  for (let i = 0; i < figures.length; i++) {
    for (let j = i + 1; j < figures.length; j++) {
      const a = figures[i];
      const b = figures[j];
      for (const [pa, p] of Object.entries(a.shape)) {
        for (const [pb, q] of Object.entries(b.shape)) {
          expect(overlaps(p, q), `${a.id} ${pa} and ${b.id} ${pb}`).toBe(false);
        }
      }
    }
  }
}

describe("layoutWorld", () => {
  it("excludes slain monsters", () => {
    const ids = layoutWorld(world()).monsters.map((m) => m.monster.id);
    expect(ids).toEqual(["m1", "m2", "m3"]);
  });

  it("flags unfought monsters (secondary targets count as fought)", () => {
    const flags = Object.fromEntries(layoutWorld(world()).monsters.map((m) => [m.monster.id, m.unfought]));
    expect(flags).toEqual({ m1: false, m2: false, m3: true });
  });

  it("gives each monster its base radius", () => {
    const [m1] = layoutWorld(world()).monsters;
    expect(m1.radius).toBe(monsterBaseRadius("XL"));
  });

  it("lists living targets once each, in order", () => {
    const w = world();
    w.heroes.push(hero("fay", ["m2", "m3", "m2", "m1", "m3"]));
    const fay = layoutWorld(w).heroes.find((h) => h.hero.id === "fay")!;
    expect(fay.targets).toEqual(["m2", "m3", "m1"]);
  });

  it("ignores targets that point at slain or missing monsters", () => {
    const w = world();
    w.heroes.push(hero("dan", ["dead", "nope", "m3"]), hero("eve", ["dead"], { x: 900, y: 900 }));
    const l = layoutWorld(w);
    expect(l.heroes.find((h) => h.hero.id === "dan")!.targets).toEqual(["m3"]);
    expect(l.heroes.find((h) => h.hero.id === "eve")!.targets).toEqual([]);
    expect(l.monsters.find((m) => m.monster.id === "m3")!.unfought).toBe(false);
    // Eve is idle at her pos; the slain monster pulls nobody.
    expect(dist(heroAt(l, "eve"), { x: 900, y: 900 })).toBeLessThan(1);
  });

  describe("the user's example", () => {
    const l = layoutWorld(example());
    const m1 = monsterAt(l, "M1");
    const m2 = monsterAt(l, "M2");
    const h1 = heroAt(l, "H1");
    const h2 = heroAt(l, "H2");

    it("keeps both monsters at their homes: heroes go to their monsters, never the other way", () => {
      expect(dist(m1, { x: -600, y: 0 })).toBeLessThan(1);
      expect(dist(m2, { x: 600, y: 0 })).toBeLessThan(1);
    });

    it("puts H1 between them, closer to M1, its main target", () => {
      expect(h1.x).toBeGreaterThan(m1.x);
      expect(h1.x).toBeLessThan(m2.x);
      expect(dist(h1, m1)).toBeLessThan(dist(h1, m2));
    });

    it("puts H2 next to M2", () => {
      expect(dist(h2, m2)).toBeLessThan(monsterBaseRadius("L") + HERO_BASE_RADIUS + MAIN_GAP + 20);
      expect(dist(h2, m2)).toBeLessThan(dist(h2, m1));
    });
  });

  it("keeps two separate clusters apart, each near the middle of its homes", () => {
    const w: World = {
      monsters: [
        monster("a1", "L", -900, -100),
        monster("a2", "M", -600, 200),
        monster("b1", "XL", 700, 0),
        monster("b2", "S", 1000, 300),
      ],
      heroes: [
        hero("ha1", ["a1", "a2"]),
        hero("ha2", ["a2"]),
        hero("hb1", ["b1", "b2"]),
        hero("hb2", ["b2", "b1"]),
      ],
    };
    const l = layoutWorld(w);
    const a = centre([monsterAt(l, "a1"), monsterAt(l, "a2"), heroAt(l, "ha1"), heroAt(l, "ha2")]);
    const b = centre([monsterAt(l, "b1"), monsterAt(l, "b2"), heroAt(l, "hb1"), heroAt(l, "hb2")]);
    expect(dist(a, centre([{ x: -900, y: -100 }, { x: -600, y: 200 }]))).toBeLessThan(150);
    expect(dist(b, centre([{ x: 700, y: 0 }, { x: 1000, y: 300 }]))).toBeLessThan(150);
    expect(dist(a, b)).toBeGreaterThan(1000);
  });

  describe("figures with a home", () => {
    /** The user's example, plus an unfought monster and an idle hero with their homes where H1 and H2 stand. */
    const free = layoutWorld(example());
    const lone = heroAt(free, "H1");
    const idle = heroAt(free, "H2");
    function crowded(): World {
      const w = example();
      w.monsters.push(monster("lone", "M", lone.x, lone.y));
      w.heroes.push(hero("idle", [], idle));
      return w;
    }

    it("are drawn at their stored positions when nothing is near them", () => {
      const w = world();
      w.monsters.push(monster("far", "M", 3000, 3000));
      w.heroes.push(hero("rest", [], { x: -3000, y: 2500 }));
      const l = layoutWorld(w);
      expect(dist(monsterAt(l, "far"), { x: 3000, y: 3000 })).toBeLessThan(1);
      expect(dist(heroAt(l, "rest"), { x: -3000, y: 2500 })).toBeLessThan(1);
      expect(dist(monsterAt(l, "m3"), { x: 300, y: 0 })).toBeLessThan(1);
      expect(dist(heroAt(l, "bob"), { x: 10, y: 20 })).toBeLessThan(1);
    });

    it("are nudged aside when a cluster gathers on top of them", () => {
      const l = layoutWorld(crowded());
      expectNoOverlaps(l);
      expect(dist(monsterAt(l, "lone"), lone)).toBeGreaterThan(10);
      expect(dist(heroAt(l, "idle"), idle)).toBeGreaterThan(10);
    });

    it("drift back home once the cluster leaves", () => {
      const before = layoutWorld(crowded());
      const w = crowded();
      const away: Record<string, Pos> = { H1: { x: 0, y: 2000 }, H2: { x: 0, y: -2000 } };
      w.heroes = w.heroes.map((h) => (away[h.id] ? { ...h, targets: [], pos: away[h.id] } : h));
      const after = layoutWorld(w);
      expect(dist(monsterAt(before, "lone"), lone)).toBeGreaterThan(10);
      expect(dist(monsterAt(after, "lone"), lone)).toBeLessThan(1);
      expect(dist(heroAt(after, "idle"), idle)).toBeLessThan(1);
    });
  });

  it("holds a pinned monster exactly where it is pinned, and its fighters follow", () => {
    const w = world();
    const pinned = layoutWorld(w, { pin: { id: "m1", pos: { x: -1400, y: 600 } } });
    expect(monsterAt(pinned, "m1")).toEqual({ x: -1400, y: 600 });
    const reach = monsterBaseRadius("XL") + HERO_BASE_RADIUS + MAIN_GAP + 20;
    expect(dist(heroAt(pinned, "cid"), { x: -1400, y: 600 })).toBeLessThan(reach);
  });

  it.each([
    ["the sample world", world()],
    ["the user's example", example()],
    ["one monster with many fighters", { monsters: [monster("m", "S", 0, 0)], heroes: Array.from({ length: 14 }, (_, i) => hero(`h${i}`, ["m"])) }],
    ["40 monsters and 25 heroes", crowd(40, 25)],
  ])("leaves no overlaps in %s", (_, w) => {
    expectNoOverlaps(layoutWorld(w));
  });

  it("gives equal results for equal input", () => {
    expect(layoutWorld(crowd(20, 12))).toEqual(layoutWorld(crowd(20, 12)));
  });

  it("does not depend on the order of the files", () => {
    const w = crowd(20, 12);
    const flipped = { monsters: [...w.monsters].reverse(), heroes: [...w.heroes].reverse() };
    const pos = (l: WorldLayout) => ({
      monsters: Object.fromEntries(l.monsters.map((m) => [m.monster.id, m.pos])),
      heroes: Object.fromEntries(l.heroes.map((h) => [h.hero.id, h.pos])),
    });
    expect(pos(layoutWorld(flipped))).toEqual(pos(layoutWorld(w)));
  });

  it("lays out 40 monsters and 25 heroes in under 10 ms", () => {
    const w = crowd(40, 25);
    layoutWorld(w);
    const times: number[] = [];
    for (let run = 0; run < 7; run++) {
      const t0 = performance.now();
      layoutWorld(w);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    // The budget is for a developer machine; shared CI runners get four times as long.
    expect(times[3]).toBeLessThan(10 * (process.env.CI ? 4 : 1));
  });
});

describe("figureShape", () => {
  const placed = (name: string, size: Size = "XL") =>
    layoutWorld({ monsters: [monster("m", size, 0, 0, { name })], heroes: [] }).monsters[0];

  it("covers the mini and its whole base", () => {
    const m = placed("Dragon");
    const { body } = monsterShape(m);
    const model = miniBodyRect(monsterMini(m.monster), m.pos, m.radius);
    expect(body.x).toBeLessThanOrEqual(Math.min(model.x, -m.radius));
    expect(body.y).toBeLessThanOrEqual(model.y);
    expect(body.x + body.width).toBeGreaterThanOrEqual(Math.max(model.x + model.width, m.radius));
    expect(body.y + body.height).toBeGreaterThanOrEqual(m.radius * BASE_SQUASH - 1e-9);
  });

  it("hangs the tag just below the front of the base, as wide as the name needs", () => {
    const short = monsterShape(placed("Orc"));
    const long = monsterShape(placed("Search Rewrite"));
    expect(short.tag.width).toBeLessThan(long.tag.width);
    expect(short.tag.y).toBeGreaterThan(monsterBaseRadius("XL") * BASE_SQUASH);
    expect(short.tag.y).toBeLessThan(monsterBaseRadius("XL") * BASE_SQUASH + 10);
  });

  it("matches the tag the map draws at TAG_ROOM_SCALE", () => {
    const m = placed("Flaky CI", "M");
    expect(monsterShape(m).tag).toEqual(tagRect(m.pos, m.radius, "Flaky CI", MONSTER_TAG_FONT, TAG_ROOM_SCALE));
  });
});

describe("shownTags", () => {
  const crowded = layoutWorld(crowd(40, 25));

  it("shows every tag at the zoom the layout keeps room for", () => {
    const all = shownTags(crowded, TAG_ROOM_SCALE);
    expect(all.size).toBe(crowded.monsters.length + crowded.heroes.length);
  });

  it("leaves out tags that would cover each other when zoomed out, keeping unfought monsters first", () => {
    const far = shownTags(crowded, 0.3);
    expect(far.size).toBeLessThan(crowded.monsters.length);
    expect([...far].some((k) => k.startsWith("hero:"))).toBe(false);
    const tags = crowded.monsters.filter((m) => far.has(`monster:${m.monster.id}`)).map((m) => monsterShape(m, 0.3).tag);
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) expect(overlaps(tags[i], tags[j])).toBe(false);
    // An unfought monster's tag only ever gives way to another unfought one.
    for (const m of crowded.monsters.filter((m) => m.unfought && !far.has(`monster:${m.monster.id}`))) {
      const tag = monsterShape(m, 0.3).tag;
      const over = crowded.monsters.filter((o) => far.has(`monster:${o.monster.id}`) && overlaps(tag, monsterShape(o, 0.3).tag));
      expect(over.some((o) => o.unfought)).toBe(true);
    }
  });

  it("always keeps the tag of the figure it is asked to put first", () => {
    for (const m of crowded.monsters) {
      expect(shownTags(crowded, 0.3, `monster:${m.monster.id}`).has(`monster:${m.monster.id}`)).toBe(true);
    }
  });
});

describe("openingPoints", () => {
  it("covers the body and tag of every living monster and every hero", () => {
    const l = layoutWorld(world());
    const points = openingPoints(l);
    expect(points).toHaveLength((3 + 3) * 4);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    for (const shape of [...l.monsters.map((m) => monsterShape(m)), ...l.heroes.map((h) => heroShape(h))]) {
      expect(Math.min(...xs)).toBeLessThanOrEqual(shape.tag.x);
      expect(Math.max(...ys)).toBeGreaterThanOrEqual(shape.tag.y + shape.tag.height);
      expect(Math.min(...ys)).toBeLessThanOrEqual(shape.body.y);
    }
  });
});
