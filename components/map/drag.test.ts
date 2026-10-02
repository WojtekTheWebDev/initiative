import { describe, expect, it } from "vitest";
import type { World } from "@/lib/types";
import { layoutWorld } from "@/lib/map/layout";
import { makeWorld } from "@/lib/domain/test-fixtures";
import {
  applyOp,
  hitTestMonster,
  layoutWithDrag,
  pastThreshold,
  resolveHeroDrop,
  worldWithDrag,
} from "./drag";

const hero = (w: World, id: string) => w.heroes.find((h) => h.id === id)!;
const monster = (w: World, id: string) => w.monsters.find((m) => m.id === id)!;

describe("pastThreshold", () => {
  it("is a click below 4px and a drag from 4px", () => {
    expect(pastThreshold({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(false);
    expect(pastThreshold({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(true);
    expect(pastThreshold({ x: 10, y: 10 }, { x: 10, y: 14 })).toBe(true);
  });
});

describe("hitTestMonster", () => {
  const monsters = layoutWorld(makeWorld()).monsters; // m1 S r=26 at (-100,10), m2 M r=34 at (-200,20)

  it("hits inside the base radius, including the edge", () => {
    expect(hitTestMonster(monsters, { x: -100, y: 10 })?.monster.id).toBe("m1");
    expect(hitTestMonster(monsters, { x: -74, y: 10 })?.monster.id).toBe("m1");
  });

  it("misses just outside the base and on empty ground", () => {
    expect(hitTestMonster(monsters, { x: -73, y: 10 })).toBeNull();
    expect(hitTestMonster(monsters, { x: 1000, y: 1000 })).toBeNull();
  });

  it("ignores slain monsters (they are not in the layout)", () => {
    expect(hitTestMonster(monsters, { x: 0, y: 40 })).toBeNull();
  });

  it("picks the nearest center when bases overlap", () => {
    const close = layoutWorld({
      monsters: [
        { id: "a", name: "A", size: "XL", pos: { x: 0, y: 0 } },
        { id: "b", name: "B", size: "XL", pos: { x: 60, y: 0 } },
      ],
      heroes: [],
    }).monsters;
    expect(hitTestMonster(close, { x: 25, y: 0 })?.monster.id).toBe("a");
    expect(hitTestMonster(close, { x: 35, y: 0 })?.monster.id).toBe("b");
  });
});

describe("resolveHeroDrop", () => {
  const w = makeWorld(); // ana: [m1, m2], bob: [m1], cid idle
  const monsters = layoutWorld(w).monsters;
  const onM1 = { x: -100, y: 10 };
  const onM2 = { x: -200, y: 20 };
  const onM3 = { x: 300, y: 30 };
  const ground = { x: 500, y: -500 };
  const stand = { x: 490, y: -490 };

  it("plain drop on another monster assigns", () => {
    expect(resolveHeroDrop(w, monsters, "ana", onM3, stand, false)).toEqual({ monsterId: "m3", shift: false });
    expect(resolveHeroDrop(w, monsters, "ana", onM2, stand, false)).toEqual({ monsterId: "m2", shift: false });
  });

  it("plain drop on the current main target is a no-op", () => {
    expect(resolveHeroDrop(w, monsters, "ana", onM1, stand, false)).toBeNull();
  });

  it("Shift+drop on a new monster adds a ghost", () => {
    expect(resolveHeroDrop(w, monsters, "bob", onM2, stand, true)).toEqual({ monsterId: "m2", shift: true });
  });

  it("Shift+drop on an existing target (main or ghost) is a no-op", () => {
    expect(resolveHeroDrop(w, monsters, "ana", onM1, stand, true)).toBeNull();
    expect(resolveHeroDrop(w, monsters, "ana", onM2, stand, true)).toBeNull();
  });

  it("drop on empty ground idles the hero where it stands", () => {
    expect(resolveHeroDrop(w, monsters, "ana", ground, stand, false)).toEqual({ pos: stand });
    expect(resolveHeroDrop(w, monsters, "ana", ground, stand, true)).toEqual({ pos: stand });
  });

  it("an idle hero dropped on a monster engages it", () => {
    expect(resolveHeroDrop(w, monsters, "cid", onM1, stand, false)).toEqual({ monsterId: "m1", shift: false });
  });

  it("an unknown hero is a no-op", () => {
    expect(resolveHeroDrop(w, monsters, "zed", onM1, stand, false)).toBeNull();
  });
});

describe("applyOp mirrors the Server Actions", () => {
  it("moveMonster", () => {
    const w = applyOp(makeWorld(), { kind: "moveMonster", id: "m1", pos: { x: 50, y: 60 } });
    expect(monster(w, "m1").pos).toEqual({ x: 50, y: 60 });
  });

  it("plain drop replaces targets", () => {
    const w = applyOp(makeWorld(), { kind: "dropHero", heroId: "ana", drop: { monsterId: "m3", shift: false } });
    expect(hero(w, "ana").targets).toEqual(["m3"]);
  });

  it("plain drop on the current main keeps ghosts", () => {
    const before = makeWorld();
    const w = applyOp(before, { kind: "dropHero", heroId: "ana", drop: { monsterId: "m1", shift: false } });
    expect(w).toBe(before);
  });

  it("Shift+drop appends a ghost", () => {
    const w = applyOp(makeWorld(), { kind: "dropHero", heroId: "bob", drop: { monsterId: "m3", shift: true } });
    expect(hero(w, "bob").targets).toEqual(["m1", "m3"]);
  });

  it("drop on ground idles", () => {
    const w = applyOp(makeWorld(), { kind: "dropHero", heroId: "ana", drop: { pos: { x: 1, y: 2 } } });
    expect(hero(w, "ana")).toMatchObject({ targets: [], pos: { x: 1, y: 2 } });
  });

  it("makeMain and removeTarget", () => {
    let w = applyOp(makeWorld(), { kind: "makeMain", heroId: "ana", monsterId: "m2" });
    expect(hero(w, "ana").targets).toEqual(["m2", "m1"]);
    w = applyOp(w, { kind: "removeTarget", heroId: "ana", monsterId: "m1" });
    expect(hero(w, "ana").targets).toEqual(["m2"]);
  });

  it("is idempotent, so re-applying on fresh server data is safe", () => {
    const op = { kind: "dropHero", heroId: "bob", drop: { monsterId: "m3", shift: true } } as const;
    const once = applyOp(makeWorld(), op);
    expect(applyOp(once, op)).toEqual(once);
  });

  it("leaves the world unchanged instead of throwing when the op no longer fits", () => {
    const before = makeWorld();
    expect(applyOp(before, { kind: "makeMain", heroId: "bob", monsterId: "m3" })).toBe(before);
    expect(applyOp(before, { kind: "moveMonster", id: "gone", pos: { x: 0, y: 0 } })).toBe(before);
  });
});

describe("live drag overrides", () => {
  it("a dragged monster moves before layout, so its ring follows", () => {
    const base = makeWorld();
    const before = layoutWorld(base);
    const after = layoutWorld(worldWithDrag(base, { kind: "monster", id: "m1", pos: { x: 400, y: 10 } }));
    const bobBefore = before.heroes.find((h) => h.hero.id === "bob")!.pos;
    const bobAfter = after.heroes.find((h) => h.hero.id === "bob")!.pos;
    expect(bobAfter.x - bobBefore.x).toBeCloseTo(500);
  });

  it("a dragged hero stands at the cursor; nothing else moves", () => {
    const layout = layoutWorld(makeWorld());
    const out = layoutWithDrag(layout, { kind: "hero", id: "ana", pos: { x: 7, y: 8 } });
    expect(out.heroes.find((h) => h.hero.id === "ana")!.pos).toEqual({ x: 7, y: 8 });
    expect(out.heroes.find((h) => h.hero.id === "bob")).toEqual(layout.heroes.find((h) => h.hero.id === "bob"));
    expect(out.ghosts).toBe(layout.ghosts);
  });

  it("no drag leaves world and layout untouched", () => {
    const w = makeWorld();
    const l = layoutWorld(w);
    expect(worldWithDrag(w, null)).toBe(w);
    expect(layoutWithDrag(l, null)).toBe(l);
    expect(worldWithDrag(w, { kind: "hero", id: "ana", pos: { x: 0, y: 0 } })).toBe(w);
    expect(layoutWithDrag(l, { kind: "monster", id: "m1", pos: { x: 0, y: 0 } })).toBe(l);
  });
});
