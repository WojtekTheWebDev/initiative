import { describe, expect, it } from "vitest";
import type { Pos, World } from "@/lib/types";
import { heroShape, layoutWorld, monsterShape, type WorldLayout } from "./layout";
import { LINK_GAP, linksOf } from "./links";
import { miniBodyRect, monsterMini } from "./minis";
import { BASE_SQUASH, HERO_BASE_RADIUS, baseRim, monsterBaseRadius } from "./rings";

const dist = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);

function world(): World {
  return {
    monsters: [
      { id: "m1", name: "One", size: "S", pos: { x: 0, y: 0 } },
      { id: "m2", name: "Two", size: "L", pos: { x: 400, y: 0 } },
      { id: "dead", name: "Dead", size: "M", pos: { x: 0, y: 400 }, slain: "2026-09-01" },
    ],
    heroes: [
      { id: "cid", name: "Cid", class: "rogue", targets: ["m2"] },
      { id: "ana", name: "Ana", class: "archer", targets: ["m1", "m2"] },
      { id: "bob", name: "Bob", class: "mage", targets: [], pos: { x: 10, y: 20 } },
    ],
  };
}

/** Puts figures at exact spots, keeping everything else the layout worked out. */
function placeAt(layout: WorldLayout, spots: Record<string, Pos>): WorldLayout {
  return {
    ...layout,
    monsters: layout.monsters.map((m) => (spots[m.monster.id] ? { ...m, pos: spots[m.monster.id] } : m)),
    heroes: layout.heroes.map((h) => (spots[h.hero.id] ? { ...h, pos: spots[h.hero.id] } : h)),
  };
}

describe("linksOf", () => {
  it("gives one link per hero and living target, by hero id then target order", () => {
    const links = linksOf(layoutWorld(world()));
    expect(links.map((l) => [l.heroId, l.monsterId, l.main])).toEqual([
      ["ana", "m1", true],
      ["ana", "m2", false],
      ["cid", "m2", true],
    ]);
  });

  it("does not depend on the order heroes appear in the layout", () => {
    const layout = layoutWorld(world());
    const flipped = { ...layout, heroes: [...layout.heroes].reverse() };
    expect(linksOf(flipped)).toEqual(linksOf(layout));
  });

  it("from above, starts past the hero's own tag and stops on top of the monster's mini", () => {
    const layout = placeAt(layoutWorld(world()), { ana: { x: 0, y: -200 }, m1: { x: 0, y: 0 } });
    const link = linksOf(layout).find((l) => l.heroId === "ana" && l.monsterId === "m1")!;
    const tag = heroShape(layout.heroes.find((h) => h.hero.id === "ana")!).tag;
    const model = miniBodyRect(monsterMini("S"), { x: 0, y: 0 }, monsterBaseRadius("S"));
    expect(link.from.x).toBeCloseTo(0);
    expect(link.from.y).toBeCloseTo(tag.y + tag.height + LINK_GAP);
    expect(link.to.x).toBeCloseTo(0);
    expect(link.to.y).toBeCloseTo(model.y - LINK_GAP);
  });

  it("stops short of the monster's tag when it comes from below, so no arrowhead hides under it", () => {
    const layout = placeAt(layoutWorld(world()), { ana: { x: 0, y: 200 }, m1: { x: 0, y: 0 } });
    const link = linksOf(layout).find((l) => l.heroId === "ana" && l.monsterId === "m1")!;
    const tag = monsterShape(layout.monsters.find((m) => m.monster.id === "m1")!).tag;
    expect(link.from.y).toBeCloseTo(200 - HERO_BASE_RADIUS * BASE_SQUASH - LINK_GAP);
    expect(link.to.x).toBeCloseTo(0);
    expect(link.to.y).toBeCloseTo(tag.y + tag.height + LINK_GAP);
  });

  it("sizes the tags it avoids for the zoom it is drawn at", () => {
    const layout = placeAt(layoutWorld(world()), { ana: { x: 0, y: 200 }, m1: { x: 0, y: 0 } });
    const near = linksOf(layout, 2).find((l) => l.monsterId === "m1")!;
    const far = linksOf(layout, 0.4).find((l) => l.monsterId === "m1")!;
    expect(far.to.y).toBeGreaterThan(near.to.y);
  });

  it("trims sideways arrows at the full base radius", () => {
    const layout = placeAt(layoutWorld(world()), { ana: { x: -300, y: 0 }, m1: { x: 0, y: 0 } });
    const link = linksOf(layout).find((l) => l.heroId === "ana" && l.monsterId === "m1")!;
    expect(link.from).toEqual({ x: expect.closeTo(-300 + HERO_BASE_RADIUS + LINK_GAP), y: expect.closeTo(0) });
    expect(link.to).toEqual({ x: expect.closeTo(-(monsterBaseRadius("S") + LINK_GAP)), y: expect.closeTo(0) });
  });

  it("points along the line between the two centres", () => {
    const layout = placeAt(layoutWorld(world()), { ana: { x: 100, y: 100 }, m2: { x: 580, y: 240 } });
    const link = linksOf(layout).find((l) => l.heroId === "ana" && l.monsterId === "m2")!;
    const hero = { x: 100, y: 100 };
    const monster = { x: 580, y: 240 };
    const [ux, uy] = [0.96, 0.28];
    expect(dist(link.from, hero)).toBeCloseTo(baseRim(HERO_BASE_RADIUS, ux, uy) + LINK_GAP);
    expect(dist(link.to, monster)).toBeCloseTo(baseRim(monsterBaseRadius("L"), ux, uy) + LINK_GAP);
    expect(dist(hero, link.from) + dist(link.from, link.to) + dist(link.to, monster)).toBeCloseTo(
      dist(hero, monster),
    );
  });

  it("skips links whose figures overlap or touch", () => {
    const layout = placeAt(layoutWorld(world()), {
      m1: { x: 0, y: 0 },
      m2: { x: 400, y: 0 },
      ana: { x: 10, y: 0 },
      cid: { x: 400, y: -45 },
    });
    const links = linksOf(layout).map((l) => `${l.heroId}:${l.monsterId}`);
    expect(links).not.toContain("ana:m1");
    expect(links).not.toContain("cid:m2"); // 45 apart up and down: closer than both bases plus their gaps
    expect(links).toContain("ana:m2");
  });

  it("skips targets that are not in the layout", () => {
    const layout = layoutWorld(world());
    const withUnknown = {
      ...layout,
      heroes: layout.heroes.map((h) => (h.hero.id === "cid" ? { ...h, targets: ["nope", "m2"] } : h)),
    };
    const cid = linksOf(withUnknown).filter((l) => l.heroId === "cid");
    expect(cid.map((l) => l.monsterId)).toEqual(["m2"]);
  });

  it("ignores slain targets (the layout drops them)", () => {
    const w = world();
    w.heroes.push({ id: "dan", name: "Dan", class: "monk", targets: ["dead", "m1"] });
    const dan = linksOf(layoutWorld(w)).filter((l) => l.heroId === "dan");
    expect(dan.map((l) => [l.monsterId, l.main])).toEqual([["m1", true]]);
  });

  it("gives idle heroes no links", () => {
    expect(linksOf(layoutWorld(world())).some((l) => l.heroId === "bob")).toBe(false);
  });
});
