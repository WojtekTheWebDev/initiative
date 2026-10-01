import { describe, expect, it } from "vitest";
import { deleteMonster, moveMonster, slay } from "./lifecycle";
import { expectValid, makeWorld } from "./test-fixtures";
import type { World } from "@/lib/types";

const hero = (w: World, id: string) => w.heroes.find((h) => h.id === id)!;
const monster = (w: World, id: string) => w.monsters.find((m) => m.id === id);

describe.each([
  ["slay", (w: World, id: string) => slay(w, id, "2026-10-01")],
  ["deleteMonster", deleteMonster],
] as const)("%s cleanup", (_name, kill) => {
  it("promotes the next target when the main is removed", () => {
    const w = kill(makeWorld(), "m1");
    expect(hero(w, "ana").targets).toEqual(["m2"]);
    expect(hero(w, "ana").pos).toBeUndefined();
    expectValid(w);
  });

  it("idles a hero with no targets left at the monster's last pos", () => {
    const w = kill(makeWorld(), "m1");
    expect(hero(w, "bob").targets).toEqual([]);
    expect(hero(w, "bob").pos).toEqual({ x: -100, y: 10 });
    expectValid(w);
  });

  it("removes a ghost target", () => {
    const w = kill(makeWorld(), "m2");
    expect(hero(w, "ana").targets).toEqual(["m1"]);
    expectValid(w);
  });

  it("leaves unrelated heroes untouched (same reference)", () => {
    const before = makeWorld();
    const w = kill(before, "m2");
    expect(hero(w, "bob")).toBe(hero(before, "bob"));
    expect(hero(w, "cid")).toBe(hero(before, "cid"));
  });

  it("does not mutate the input", () => {
    const before = makeWorld();
    kill(before, "m1");
    expect(before).toEqual(makeWorld());
  });

  it("throws on an unknown monster", () => {
    expect(() => kill(makeWorld(), "nope")).toThrow(/Unknown monster: "nope"/);
  });
});

describe("slay", () => {
  it("sets slain to today and keeps the monster", () => {
    const w = slay(makeWorld(), "m3", "2026-10-01");
    expect(monster(w, "m3")).toMatchObject({ id: "m3", slain: "2026-10-01" });
    expect(w.monsters).toHaveLength(4);
    expectValid(w);
  });

  it("is a no-op on an already slain monster", () => {
    const before = makeWorld();
    expect(slay(before, "m4", "2026-10-01")).toBe(before);
  });
});

describe("deleteMonster", () => {
  it("removes the monster", () => {
    const w = deleteMonster(makeWorld(), "m3");
    expect(monster(w, "m3")).toBeUndefined();
    expect(w.monsters).toHaveLength(3);
    expectValid(w);
  });

  it("can delete a slain monster", () => {
    const w = deleteMonster(makeWorld(), "m4");
    expect(monster(w, "m4")).toBeUndefined();
    expectValid(w);
  });
});

describe("moveMonster", () => {
  it("updates pos and nothing else", () => {
    const before = makeWorld();
    const w = moveMonster(before, "m1", { x: 50, y: -5 });
    expect(monster(w, "m1")).toEqual({ ...before.monsters[0], pos: { x: 50, y: -5 } });
    expect(before.monsters[0].pos).toEqual({ x: -100, y: 10 });
    expect(w.heroes).toBe(before.heroes);
    expectValid(w);
  });

  it("throws on an unknown monster", () => {
    expect(() => moveMonster(makeWorld(), "nope", { x: 0, y: 0 })).toThrow(/Unknown monster/);
  });
});
