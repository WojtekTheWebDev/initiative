import { describe, expect, it } from "vitest";
import { alive, creatureOf, fightersOf, territoryOf, unfought } from "./derived";
import { makeWorld } from "./test-fixtures";

describe("territoryOf", () => {
  it("splits at x = 0, with 0 in the keep", () => {
    expect(territoryOf({ x: -1, y: 0 })).toBe("team");
    expect(territoryOf({ x: 0, y: 0 })).toBe("keep");
    expect(territoryOf({ x: 1, y: 0 })).toBe("keep");
    expect(territoryOf({ x: -0.001, y: 99 })).toBe("team");
  });
});

describe("alive", () => {
  it("drops slain monsters", () => {
    expect(alive(makeWorld().monsters).map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
  });
});

describe("unfought", () => {
  it("lists living monsters nobody targets", () => {
    expect(unfought(makeWorld()).map((m) => m.id)).toEqual(["m3"]);
  });

  it("counts ghost targets as fought", () => {
    const w = makeWorld();
    w.heroes = [{ id: "x", name: "X", class: "c", targets: ["m3", "m2"] }];
    expect(unfought(w).map((m) => m.id)).toEqual(["m1"]);
  });

  it("is empty when everything is engaged or there are no monsters", () => {
    expect(unfought({ monsters: [], heroes: [] })).toEqual([]);
  });
});

describe("fightersOf", () => {
  it("splits main and ghosts, sorted by hero id", () => {
    const w = makeWorld();
    w.heroes.unshift({ id: "zed", name: "Zed", class: "c", targets: ["m1"] });
    w.heroes.push({ id: "abe", name: "Abe", class: "c", targets: ["m3", "m2"] });
    const m1 = fightersOf(w, "m1");
    expect(m1.main.map((h) => h.id)).toEqual(["ana", "bob", "zed"]);
    expect(m1.ghosts).toEqual([]);
    const m2 = fightersOf(w, "m2");
    expect(m2.main).toEqual([]);
    expect(m2.ghosts.map((h) => h.id)).toEqual(["abe", "ana"]);
  });

  it("returns empty lists for an unknown monster", () => {
    expect(fightersOf(makeWorld(), "nope")).toEqual({ main: [], ghosts: [] });
  });
});

describe("creatureOf", () => {
  it("maps sizes to creatures", () => {
    expect(["S", "M", "L", "XL"].map((s) => creatureOf(s as never))).toEqual([
      "goblin",
      "orc",
      "troll",
      "dragon",
    ]);
  });
});
