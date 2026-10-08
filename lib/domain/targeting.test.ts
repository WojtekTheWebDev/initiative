import { describe, expect, it } from "vitest";
import { addTarget, makeMain, removeTarget, setIdle } from "./targeting";
import { expectValid, makeWorld } from "./test-fixtures";
import type { World } from "@/lib/types";

const hero = (w: World, id: string) => w.heroes.find((h) => h.id === id)!;

describe("addTarget", () => {
  it("appends the monster as a secondary target", () => {
    const w = addTarget(makeWorld(), "ana", "m3");
    expect(hero(w, "ana").targets).toEqual(["m1", "m2", "m3"]);
    expectValid(w);
  });

  it("is a no-op when already a target (main or secondary)", () => {
    const before = makeWorld();
    expect(addTarget(before, "ana", "m2")).toBe(before);
    expect(addTarget(before, "ana", "m1")).toBe(before);
  });

  it("makes it the main target of an idle hero and drops pos", () => {
    const w = addTarget(makeWorld(), "cid", "m3");
    expect(hero(w, "cid").targets).toEqual(["m3"]);
    expect(hero(w, "cid").pos).toBeUndefined();
    expectValid(w);
  });

  it("throws on unknown ids and slain monsters", () => {
    expect(() => addTarget(makeWorld(), "nope", "m1")).toThrow(/Unknown hero/);
    expect(() => addTarget(makeWorld(), "ana", "nope")).toThrow(/Unknown monster/);
    expect(() => addTarget(makeWorld(), "ana", "m4")).toThrow(/slain/);
  });
});

describe("makeMain", () => {
  it("moves a secondary target to index 0 and keeps the rest in order", () => {
    let w = addTarget(makeWorld(), "ana", "m3"); // [m1, m2, m3]
    w = makeMain(w, "ana", "m3");
    expect(hero(w, "ana").targets).toEqual(["m3", "m1", "m2"]);
    expectValid(w);
  });

  it("is a no-op for the current main", () => {
    const before = makeWorld();
    expect(makeMain(before, "ana", "m1")).toBe(before);
  });

  it("throws if the monster is not a target or the hero is unknown", () => {
    expect(() => makeMain(makeWorld(), "ana", "m3")).toThrow(/does not target "m3"/);
    expect(() => makeMain(makeWorld(), "nope", "m1")).toThrow(/Unknown hero/);
  });
});

describe("removeTarget", () => {
  it("removes a secondary target", () => {
    const w = removeTarget(makeWorld(), "ana", "m2");
    expect(hero(w, "ana").targets).toEqual(["m1"]);
    expectValid(w);
  });

  it("removing the main promotes the next target", () => {
    const w = removeTarget(makeWorld(), "ana", "m1");
    expect(hero(w, "ana").targets).toEqual(["m2"]);
    expectValid(w);
  });

  it("removing the last target idles the hero at the monster's pos", () => {
    const w = removeTarget(makeWorld(), "bob", "m1");
    expect(hero(w, "bob").targets).toEqual([]);
    expect(hero(w, "bob").pos).toEqual({ x: -100, y: 10 });
    expectValid(w);
  });

  it("does not share the monster's pos object", () => {
    const before = makeWorld();
    const w = removeTarget(before, "bob", "m1");
    expect(hero(w, "bob").pos).not.toBe(before.monsters[0].pos);
  });

  it("is a no-op when the monster is not a target", () => {
    const before = makeWorld();
    expect(removeTarget(before, "ana", "m3")).toBe(before);
  });

  it("throws on unknown ids", () => {
    expect(() => removeTarget(makeWorld(), "nope", "m1")).toThrow(/Unknown hero/);
    expect(() => removeTarget(makeWorld(), "ana", "nope")).toThrow(/Unknown monster/);
  });
});

describe("setIdle", () => {
  it("clears targets and saves pos", () => {
    const w = setIdle(makeWorld(), "ana", { x: 7, y: 8 });
    expect(hero(w, "ana").targets).toEqual([]);
    expect(hero(w, "ana").pos).toEqual({ x: 7, y: 8 });
    expectValid(w);
  });

  it("moves an already idle hero", () => {
    const w = setIdle(makeWorld(), "cid", { x: -1, y: 2 });
    expect(hero(w, "cid").pos).toEqual({ x: -1, y: 2 });
    expectValid(w);
  });

  it("throws on an unknown hero", () => {
    expect(() => setIdle(makeWorld(), "nope", { x: 0, y: 0 })).toThrow(/Unknown hero/);
  });
});
