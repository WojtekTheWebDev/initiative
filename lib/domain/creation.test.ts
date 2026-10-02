import { describe, expect, it } from "vitest";
import {
  createHero,
  createMonster,
  deleteHero,
  slugify,
  uniqueId,
  updateHero,
  updateMonster,
} from "./creation";
import { expectValid, makeWorld } from "./test-fixtures";

describe("slugify", () => {
  it("makes lowercase dash slugs", () => {
    expect(slugify("Search Rewrite")).toBe("search-rewrite");
    expect(slugify("  Flaky CI!! (again) ")).toBe("flaky-ci-again");
    expect(slugify("Łukasz Żółć")).toBe("lukasz-zolc");
    expect(slugify("Café-Straße")).toBe("cafe-strasse");
    expect(slugify("🐉🐉")).toBe("");
  });
});

describe("uniqueId", () => {
  it("returns the base when free", () => {
    expect(uniqueId("search-rewrite", ["other"])).toBe("search-rewrite");
  });

  it("adds -2, -3, ... on a clash", () => {
    expect(uniqueId("search-rewrite", ["search-rewrite"])).toBe("search-rewrite-2");
    expect(uniqueId("a", ["a", "a-2", "a-3"])).toBe("a-4");
  });
});

describe("createMonster", () => {
  it("adds a monster with a slug id", () => {
    const { world, id } = createMonster(makeWorld(), {
      name: "Search Rewrite",
      size: "XL",
      notes: "spike first",
      pos: { x: -1, y: 2 },
    });
    expect(id).toBe("search-rewrite");
    expect(world.monsters.at(-1)).toEqual({
      id,
      name: "Search Rewrite",
      size: "XL",
      pos: { x: -1, y: 2 },
      notes: "spike first",
    });
    expectValid(world);
  });

  it("suffixes on a clash, omits empty notes, falls back for unsluggable names", () => {
    const w = makeWorld();
    const a = createMonster(w, { name: "M1", size: "S", notes: "  ", pos: { x: 0, y: 0 } });
    expect(a.id).toBe("m1-2");
    expect("notes" in a.world.monsters.at(-1)!).toBe(false);
    const b = createMonster(a.world, { name: "🐉", size: "S", pos: { x: 0, y: 0 } });
    expect(b.id).toBe("monster");
    expectValid(b.world);
  });

  it("uses a namespace separate from heroes", () => {
    const { id } = createMonster(makeWorld(), { name: "Ana", size: "S", pos: { x: 0, y: 0 } });
    expect(id).toBe("ana");
  });
});

describe("createHero", () => {
  it("adds an idle hero", () => {
    const { world, id } = createHero(makeWorld(), { name: "Dana", class: "cleric", pos: { x: 3, y: 4 } });
    expect(id).toBe("dana");
    expect(world.heroes.at(-1)).toEqual({
      id: "dana",
      name: "Dana",
      class: "cleric",
      targets: [],
      pos: { x: 3, y: 4 },
    });
    expectValid(world);
  });

  it("suffixes on a clash and ignores monster ids", () => {
    const w = makeWorld();
    expect(createHero(w, { name: "Ana", class: "x", pos: { x: 0, y: 0 } }).id).toBe("ana-2");
    expect(createHero(w, { name: "M1", class: "x", pos: { x: 0, y: 0 } }).id).toBe("m1");
    expect(createHero(w, { name: "!!", class: "x", pos: { x: 0, y: 0 } }).id).toBe("hero");
  });
});

describe("updateMonster", () => {
  it("renames without changing the id", () => {
    const w = updateMonster(makeWorld(), "m1", { name: "Renamed", size: "XL" });
    expect(w.monsters[0]).toMatchObject({ id: "m1", name: "Renamed", size: "XL" });
    expectValid(w);
  });

  it("sets, keeps and clears notes", () => {
    let w = updateMonster(makeWorld(), "m1", { notes: "line1\nline2" });
    expect(w.monsters[0].notes).toBe("line1\nline2");
    w = updateMonster(w, "m1", { name: "x" });
    expect(w.monsters[0].notes).toBe("line1\nline2");
    w = updateMonster(w, "m1", { notes: "" });
    expect("notes" in w.monsters[0]).toBe(false);
    w = updateMonster(makeWorld(), "m2", { notes: undefined });
    expect("notes" in w.monsters[1]).toBe(false);
  });

  it("throws on an unknown monster", () => {
    expect(() => updateMonster(makeWorld(), "nope", {})).toThrow(/Unknown monster/);
  });
});

describe("hero minis", () => {
  it("stores a picked mini on create, and none for a blank pick", () => {
    const picked = createHero(makeWorld(), { name: "Dana", class: "cleric", mini: " knight ", pos: { x: 0, y: 0 } });
    expect(picked.world.heroes.at(-1)?.mini).toBe("knight");
    const blank = createHero(makeWorld(), { name: "Dana", class: "cleric", mini: "", pos: { x: 0, y: 0 } });
    expect("mini" in blank.world.heroes.at(-1)!).toBe(false);
    expectValid(picked.world);
  });

  it("sets, keeps and removes the mini on update", () => {
    let w = updateHero(makeWorld(), "ana", { mini: "ranger-of-the-north" });
    expect(w.heroes[0].mini).toBe("ranger-of-the-north"); // unknown ids are kept; they only change the drawing
    w = updateHero(w, "ana", { name: "Anna" });
    expect(w.heroes[0].mini).toBe("ranger-of-the-north");
    w = updateHero(w, "ana", { mini: "" });
    expect("mini" in w.heroes[0]).toBe(false);
    expectValid(w);
  });
});

describe("updateHero", () => {
  it("renames and reclasses without changing the id", () => {
    const w = updateHero(makeWorld(), "ana", { name: "Anna", class: "mage" });
    expect(w.heroes[0]).toMatchObject({ id: "ana", name: "Anna", class: "mage", targets: ["m1", "m2"] });
    const same = updateHero(makeWorld(), "ana", {});
    expect(same.heroes[0]).toEqual(makeWorld().heroes[0]);
    expectValid(w);
  });

  it("throws on an unknown hero", () => {
    expect(() => updateHero(makeWorld(), "nope", { name: "x" })).toThrow(/Unknown hero/);
  });
});

describe("deleteHero", () => {
  it("removes the hero", () => {
    const w = deleteHero(makeWorld(), "bob");
    expect(w.heroes.map((h) => h.id)).toEqual(["ana", "cid"]);
    expectValid(w);
  });

  it("throws on an unknown hero", () => {
    expect(() => deleteHero(makeWorld(), "nope")).toThrow(/Unknown hero/);
  });
});
