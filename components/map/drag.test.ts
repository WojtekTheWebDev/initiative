import { describe, expect, it } from "vitest";
import type { Pos, World } from "@/lib/types";
import { MAIN_GAP, heroShape, layoutWorld, monsterShape } from "@/lib/map/layout";
import { LINK_GAP, linksOf } from "@/lib/map/links";
import { HERO_BASE_RADIUS, baseRim, monsterBaseRadius } from "@/lib/map/rings";
import { miniBodyRect, monsterMini } from "@/lib/map/minis";
import { makeWorld } from "@/lib/domain/test-fixtures";
import {
  applyOp,
  dropAction,
  heroHomeAfterDrag,
  hitTestMonster,
  homeAfterDrag,
  layoutWithDrag,
  pastThreshold,
  resolveHeroDrop,
  type WorldOp,
} from "./drag";

const hero = (w: World, id: string) => w.heroes.find((h) => h.id === id)!;
const monster = (w: World, id: string) => w.monsters.find((m) => m.id === id)!;
const dist = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);

describe("pastThreshold", () => {
  it("is a click below 4px and a drag from 4px", () => {
    expect(pastThreshold({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(false);
    expect(pastThreshold({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(true);
    expect(pastThreshold({ x: 10, y: 10 }, { x: 10, y: 14 })).toBe(true);
  });
});

describe("hitTestMonster", () => {
  /** m1 S r=31 at (-100, 10), m2 M r=40 at (-200, 20), m3 L r=52 at (300, 30). */
  const monsters = layoutWorld(makeWorld()).monsters.map((m) => ({ ...m, pos: m.monster.pos }));

  it("hits inside the base ellipse, including its rim", () => {
    expect(hitTestMonster(monsters, { x: -100, y: 10 })?.monster.id).toBe("m1");
    expect(hitTestMonster(monsters, { x: -100 + monsterBaseRadius("S"), y: 10 })?.monster.id).toBe("m1");
  });

  it("misses just outside the base and on empty ground", () => {
    expect(hitTestMonster(monsters, { x: -99 + monsterBaseRadius("S"), y: 10 })).toBeNull();
    expect(hitTestMonster(monsters, { x: 1000, y: 1000 })).toBeNull();
  });

  it("ignores slain monsters (they are not in the layout)", () => {
    expect(hitTestMonster(monsters, { x: 0, y: 40 })).toBeNull();
  });

  it("hits the body of a tall mini, up to the top of its head and out to its wings", () => {
    const m3 = monsters.find((m) => m.monster.id === "m3")!;
    const king = miniBodyRect(monsterMini("L"), m3.pos, m3.radius);
    expect(hitTestMonster(monsters, { x: m3.pos.x, y: king.y + 1 })?.monster.id).toBe("m3");
    expect(hitTestMonster(monsters, { x: m3.pos.x, y: king.y - 1 })).toBeNull();

    const dragon = layoutWorld({
      monsters: [{ id: "d", name: "D", size: "XL", pos: { x: 0, y: 0 } }],
      heroes: [],
    }).monsters;
    const wings = miniBodyRect(monsterMini("XL"), dragon[0].pos, dragon[0].radius);
    expect(hitTestMonster(dragon, { x: wings.x + 2, y: wings.y + wings.height * 0.4 })?.monster.id).toBe("d");
    expect(hitTestMonster(dragon, { x: wings.x - 2, y: wings.y + wings.height * 0.4 })).toBeNull();
  });

  it("picks the figure drawn in front where a near mini covers a far one", () => {
    const pair = layoutWorld({
      monsters: [
        { id: "far", name: "Far", size: "XL", pos: { x: 0, y: 0 } },
        { id: "near", name: "Near", size: "S", pos: { x: 0, y: 50 } },
      ],
      heroes: [],
    }).monsters.map((m) => ({ ...m, pos: m.monster.pos }));
    // On the far monster's base, and on the near spider's body, which is drawn over it.
    expect(hitTestMonster(pair, { x: 0, y: 30 })?.monster.id).toBe("near");
    expect(hitTestMonster(pair, { x: 0, y: -20 })?.monster.id).toBe("far");
  });

  it("picks the nearest center when bases overlap at the same depth", () => {
    const close = layoutWorld({
      monsters: [
        { id: "a", name: "A", size: "XL", pos: { x: 0, y: 0 } },
        { id: "b", name: "B", size: "XL", pos: { x: 60, y: 0 } },
      ],
      heroes: [],
    }).monsters.map((m) => ({ ...m, pos: m.monster.pos }));
    expect(hitTestMonster(close, { x: 25, y: 0 })?.monster.id).toBe("a");
    expect(hitTestMonster(close, { x: 35, y: 0 })?.monster.id).toBe("b");
  });
});

describe("resolveHeroDrop", () => {
  const w = makeWorld(); // ana: [m1, m2], bob: [m1], cid idle
  const monsters = layoutWorld(w).monsters.map((m) => ({ ...m, pos: m.monster.pos }));
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

  it("Shift+drop on a new monster adds a secondary target", () => {
    expect(resolveHeroDrop(w, monsters, "bob", onM2, stand, true)).toEqual({ monsterId: "m2", shift: true });
  });

  it("Shift+drop on an existing target (main or secondary) is a no-op", () => {
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

  it("plain drop on the current main keeps secondary targets", () => {
    const before = makeWorld();
    const w = applyOp(before, { kind: "dropHero", heroId: "ana", drop: { monsterId: "m1", shift: false } });
    expect(w).toBe(before);
  });

  it("Shift+drop appends a secondary target", () => {
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

  it("slay and revive, each safe to re-apply", () => {
    const before = makeWorld();
    const slain = applyOp(before, { kind: "slay", id: "m1", today: "2026-10-05" });
    expect(monster(slain, "m1")).toMatchObject({ slain: "2026-10-05", slainBy: ["ana", "bob"] });
    expect(hero(slain, "bob")).toMatchObject({ targets: [], pos: { x: -100, y: 10 } });
    expect(applyOp(slain, { kind: "slay", id: "m1", today: "2026-10-06" })).toBe(slain);

    const op: WorldOp = {
      kind: "revive",
      id: "m1",
      before: [
        { id: "ana", targets: ["m1", "m2"] },
        { id: "bob", targets: ["m1"] },
      ],
    };
    const revived = applyOp(slain, op);
    expect(monster(revived, "m1").slain).toBeUndefined();
    expect(revived.heroes).toEqual(before.heroes);
    expect(applyOp(revived, op)).toBe(revived);
  });

  it("leaves the world unchanged instead of throwing when the op no longer fits", () => {
    const before = makeWorld();
    expect(applyOp(before, { kind: "makeMain", heroId: "bob", monsterId: "m3" })).toBe(before);
    expect(applyOp(before, { kind: "moveMonster", id: "gone", pos: { x: 0, y: 0 } })).toBe(before);
  });
});

describe("dropAction", () => {
  const shelf = { left: 400, top: 700, right: 600, bottom: 760 };

  it("slays a monster let go over the trophy shelf, edges included", () => {
    expect(dropAction("monster", { x: 500, y: 730 }, false, shelf)).toBe("slay");
    expect(dropAction("monster", { x: 400, y: 700 }, false, shelf)).toBe("slay");
    expect(dropAction("monster", { x: 600, y: 760 }, false, shelf)).toBe("slay");
  });

  it("only moves a monster let go just short of the shelf", () => {
    expect(dropAction("monster", { x: 500, y: 699 }, true, shelf)).toBe("place");
    expect(dropAction("monster", { x: 399, y: 730 }, true, shelf)).toBe("place");
  });

  it("snaps a hero let go over the shelf back", () => {
    expect(dropAction("hero", { x: 500, y: 730 }, false, shelf)).toBe("none");
    expect(dropAction("hero", { x: 500, y: 730 }, true, shelf)).toBe("none");
  });

  it("places either figure on the map and snaps either back over another HUD surface", () => {
    expect(dropAction("hero", { x: 100, y: 100 }, true, shelf)).toBe("place");
    expect(dropAction("monster", { x: 100, y: 100 }, true, null)).toBe("place");
    expect(dropAction("monster", { x: 10, y: 10 }, false, shelf)).toBe("none");
    expect(dropAction("hero", { x: 10, y: 10 }, false, null)).toBe("none");
  });
});

describe("live drag", () => {
  it("pins a dragged monster at its drawn position and lays the map out around it", () => {
    const w = makeWorld();
    const layout = layoutWorld(w);
    const out = layoutWithDrag(w, layout, { kind: "monster", id: "m1", pos: { x: 900, y: 10 } });
    expect(out.monsters.find((m) => m.monster.id === "m1")!.pos).toEqual({ x: 900, y: 10 });
    // Bob fights only m1, so he comes along.
    const reach = monsterBaseRadius("S") + HERO_BASE_RADIUS + MAIN_GAP + 20;
    expect(dist(out.heroes.find((h) => h.hero.id === "bob")!.pos, { x: 900, y: 10 })).toBeLessThan(reach);
  });

  it("a dragged hero stands at the cursor and keeps its targets; nothing else moves", () => {
    const w = makeWorld();
    const layout = layoutWorld(w);
    const out = layoutWithDrag(w, layout, { kind: "hero", id: "ana", pos: { x: 7, y: 8 } });
    const ana = out.heroes.find((h) => h.hero.id === "ana")!;
    expect(ana.pos).toEqual({ x: 7, y: 8 });
    expect(ana.targets).toEqual(["m1", "m2"]);
    expect(out.heroes.find((h) => h.hero.id === "bob")).toEqual(layout.heroes.find((h) => h.hero.id === "bob"));
    expect(out.monsters).toBe(layout.monsters);
  });

  it("a dragged hero's arrows start from the cursor", () => {
    const w = makeWorld();
    const out = layoutWithDrag(w, layoutWorld(w), { kind: "hero", id: "ana", pos: { x: -600, y: 0 } });
    const ana = linksOf(out).filter((l) => l.heroId === "ana");
    expect(ana.map((l) => l.monsterId)).toEqual(["m1", "m2"]);
    for (const l of ana) {
      const d = Math.hypot(l.from.x + 600, l.from.y);
      const [ux, uy] = [(l.from.x + 600) / d, l.from.y / d];
      expect(d).toBeCloseTo(baseRim(HERO_BASE_RADIUS, ux, uy) + LINK_GAP);
    }
  });

  it("a monster dragged over many frames, each laid out from the one before, brings its fighters and covers nothing", () => {
    const w = makeWorld();
    const base = layoutWorld(w);
    const start = base.monsters.find((m) => m.monster.id === "m1")!.pos;
    let frame = base;
    let pos = start;
    for (let i = 1; i <= 30; i++) {
      pos = { x: start.x + i * 20, y: start.y - i * 8 };
      frame = layoutWithDrag(w, base, { kind: "monster", id: "m1", pos }, frame);
    }
    expect(frame.monsters.find((m) => m.monster.id === "m1")!.pos).toEqual(pos);
    const reach = monsterBaseRadius("S") + HERO_BASE_RADIUS + MAIN_GAP + 40;
    expect(dist(frame.heroes.find((h) => h.hero.id === "bob")!.pos, pos)).toBeLessThan(reach);
    const rects = [...frame.monsters.map((m) => monsterShape(m)), ...frame.heroes.map((h) => heroShape(h))].flatMap((s) => [s.body, s.tag]);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (Math.floor(i / 2) === Math.floor(j / 2)) continue; // a figure's own body and tag
        const [a, b] = [rects[i], rects[j]];
        expect(a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height).toBe(false);
      }
    }
  });

  it("no drag leaves the layout untouched", () => {
    const w = makeWorld();
    const l = layoutWorld(w);
    expect(layoutWithDrag(w, l, null)).toBe(l);
  });
});

describe("dropping moves the home by the drag offset", () => {
  it("adds the drawn offset to the home", () => {
    expect(homeAfterDrag({ x: 100, y: 50 }, { x: 80, y: 70 }, { x: 380, y: -30 })).toEqual({ x: 400, y: -50 });
  });

  it("a dropped monster settles where it was let go when no other monster shares its heroes", () => {
    // Ana and Bob fight only m1, so m1 and its fighters move as one. Everything
    // else stands well away, so nothing crowds them before or after the drop.
    const ops: WorldOp[] = [
      { kind: "removeTarget", heroId: "ana", monsterId: "m2" },
      { kind: "moveMonster", id: "m2", pos: { x: -900, y: 20 } },
      { kind: "moveMonster", id: "m3", pos: { x: 900, y: -600 } },
      { kind: "dropHero", heroId: "cid", drop: { pos: { x: -900, y: -600 } } },
    ];
    const w = ops.reduce(applyOp, makeWorld());
    const before = layoutWorld(w);
    const press = before.monsters.find((m) => m.monster.id === "m1")!.pos;
    const drop = { x: press.x + 1500, y: press.y + 900 };
    const home = homeAfterDrag(monster(w, "m1").pos, press, drop);
    const after = layoutWorld(applyOp(w, { kind: "moveMonster", id: "m1", pos: home }));
    expect(dist(after.monsters.find((m) => m.monster.id === "m1")!.pos, drop)).toBeLessThan(1);
  });

  it("an idle hero's home moves by the offset; an engaged hero stands where it was let go", () => {
    const layout = layoutWorld(makeWorld());
    const cid = layout.heroes.find((h) => h.hero.id === "cid")!; // idle, home (5, 5)
    const ana = layout.heroes.find((h) => h.hero.id === "ana")!;
    const press = { x: 20, y: 0 };
    const drop = { x: 120, y: -40 };
    expect(heroHomeAfterDrag(cid, press, drop)).toEqual({ x: 105, y: -35 });
    expect(heroHomeAfterDrag(ana, press, drop)).toEqual(drop);
  });
});
