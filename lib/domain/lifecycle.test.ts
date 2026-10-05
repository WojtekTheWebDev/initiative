import { describe, expect, it } from "vitest";
import { deleteMonster, heroesChanged, localToday, moveMonster, revive, slay } from "./lifecycle";
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

  it("records slainBy: main fighters first, then secondary, each by id", () => {
    const before = makeWorld();
    before.heroes.push(
      { id: "zed", name: "Zed", class: "c", targets: ["m3", "m1"] },
      { id: "dan", name: "Dan", class: "c", targets: ["m1"] },
      { id: "abe", name: "Abe", class: "c", targets: ["m2", "m1"] },
    );
    expect(monster(slay(before, "m1", "2026-10-01"), "m1")?.slainBy).toEqual(["ana", "bob", "dan", "abe", "zed"]);
    expect(monster(slay(makeWorld(), "m2", "2026-10-01"), "m2")?.slainBy).toEqual(["ana"]);
  });

  it("leaves slainBy out when nobody fought it", () => {
    const w = slay(makeWorld(), "m3", "2026-10-01");
    expect(monster(w, "m3")).not.toHaveProperty("slainBy");
  });
});

describe("heroesChanged", () => {
  it("lists the heroes a slay changed, as they were before", () => {
    const before = makeWorld();
    expect(heroesChanged(before, slay(before, "m1", "2026-10-01"))).toEqual([
      { id: "ana", targets: ["m1", "m2"] },
      { id: "bob", targets: ["m1"] },
    ]);
    expect(heroesChanged(before, slay(before, "m3", "2026-10-01"))).toEqual([]);
  });

  it("keeps an idle hero's pos", () => {
    const before = makeWorld();
    const after = { ...before, heroes: before.heroes.map((h) => (h.id === "cid" ? { ...h, targets: ["m3"], pos: undefined } : h)) };
    expect(heroesChanged(before, after)).toEqual([{ id: "cid", targets: [], pos: { x: 5, y: 5 } }]);
  });
});

describe("revive", () => {
  const slayM1 = () => {
    const before = makeWorld();
    const after = slay(before, "m1", "2026-10-01");
    return { before, after, changed: heroesChanged(before, after) };
  };

  it("clears slain and slainBy and restores unchanged heroes, including the idle pos", () => {
    const { before, after, changed } = slayM1();
    expect(hero(after, "bob").pos).toEqual({ x: -100, y: 10 });
    const w = revive(after, "m1", changed);
    expect(monster(w, "m1")).toEqual(monster(before, "m1"));
    expect(hero(w, "ana")).toEqual(hero(before, "ana"));
    expect(hero(w, "bob")).toEqual(hero(before, "bob"));
    expect(hero(w, "bob")).not.toHaveProperty("pos");
    expect(w).toEqual(before);
    expectValid(w);
  });

  it("leaves alone a hero that was reassigned after the slay", () => {
    const { before, after, changed } = slayM1();
    const moved = {
      ...after,
      heroes: after.heroes.map((h) => (h.id === "bob" ? { ...h, targets: ["m3"], pos: undefined } : h)),
    };
    const w = revive(moved, "m1", changed);
    expect(hero(w, "bob").targets).toEqual(["m3"]);
    expect(hero(w, "ana")).toEqual(hero(before, "ana"));
    expect(monster(w, "m1")?.slain).toBeUndefined();
    expectValid(w);
  });

  it("leaves alone an idle hero that was moved after the slay", () => {
    const { after, changed } = slayM1();
    const moved = {
      ...after,
      heroes: after.heroes.map((h) => (h.id === "bob" ? { ...h, pos: { x: 1, y: 1 } } : h)),
    };
    const w = revive(moved, "m1", changed);
    expect(hero(w, "bob")).toMatchObject({ targets: [], pos: { x: 1, y: 1 } });
    expectValid(w);
  });

  it("changes nothing for a monster that isn't slain", () => {
    const before = makeWorld();
    expect(revive(before, "m1", [{ id: "cid", targets: ["m1"] }])).toBe(before);
  });

  it("skips heroes that no longer exist", () => {
    const { after, changed } = slayM1();
    const gone = { ...after, heroes: after.heroes.filter((h) => h.id !== "bob") };
    const w = revive(gone, "m1", changed);
    expect(w.heroes.map((h) => h.id)).toEqual(["ana", "cid"]);
    expectValid(w);
  });

  it("does not mutate the input", () => {
    const { after, changed } = slayM1();
    const copy = structuredClone(after);
    revive(after, "m1", changed);
    expect(after).toEqual(copy);
  });

  it("throws on an unknown monster", () => {
    expect(() => revive(makeWorld(), "nope", [])).toThrow(/Unknown monster/);
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

describe("localToday", () => {
  it("is the local calendar date, zero-padded", () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
