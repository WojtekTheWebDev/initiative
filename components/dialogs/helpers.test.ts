import { describe, expect, it } from "vitest";
import type { Hero, Monster } from "@/lib/types";
import { HERO_MINIS } from "@/lib/map/minis";
import {
  SPAWN_JITTER,
  heroFields,
  heroPatch,
  isDirty,
  miniValue,
  monsterFields,
  monsterPatch,
  rosterIndex,
  spawnPos,
  wrapStep,
} from "./helpers";

const monster: Monster = { id: "ci", name: "Flaky CI", size: "M", pos: { x: 0, y: 0 }, notes: "retry" };
const hero = (id: string, cls: string, extra: Partial<Hero> = {}): Hero => ({
  id,
  name: id,
  class: cls,
  targets: [],
  ...extra,
});

describe("monsterPatch", () => {
  it("is empty when nothing changed", () => {
    expect(monsterPatch(monster, monsterFields(monster))).toEqual({});
  });

  it("sends only the changed fields", () => {
    expect(monsterPatch(monster, { ...monsterFields(monster), size: "XL" })).toEqual({ size: "XL" });
    expect(monsterPatch(monster, { ...monsterFields(monster), name: " CI " })).toEqual({ name: "CI" });
    expect(monsterPatch(monster, { ...monsterFields(monster), notes: "" })).toEqual({ notes: "" });
  });

  it("ignores spaces around an unchanged name", () => {
    expect(monsterPatch(monster, { ...monsterFields(monster), name: " Flaky CI  " })).toEqual({});
  });

  it("treats absent notes as empty", () => {
    const bare = { ...monster, notes: undefined };
    expect(monsterPatch(bare, monsterFields(bare))).toEqual({});
  });
});

describe("heroPatch", () => {
  const ana = hero("ana", "archer", { mini: "hooded-rogue" });

  it("writes only `mini` when only the mini changed", () => {
    expect(heroPatch(ana, { ...heroFields(ana), mini: "" })).toEqual({ mini: "" });
  });

  it("sends trimmed name and class only when they changed", () => {
    expect(heroPatch(ana, { ...heroFields(ana), class: " archer " })).toEqual({});
    expect(heroPatch(ana, { ...heroFields(ana), name: "Ana B", class: "mage" })).toEqual({
      name: "Ana B",
      class: "mage",
    });
  });

  it("sends a trimmed guild only when it changed, with absent as empty", () => {
    expect(heroPatch(ana, { ...heroFields(ana), guild: " " })).toEqual({});
    expect(heroPatch(ana, { ...heroFields(ana), guild: " Cloud " })).toEqual({ guild: "Cloud" });
    const cloud = hero("cid", "rogue", { guild: "Cloud" });
    expect(heroPatch(cloud, { ...heroFields(cloud), guild: "" })).toEqual({ guild: "" });
  });

  it("keeps a missing pick untouched when the mini was not flipped", () => {
    const lost = hero("lost", "mage", { mini: "retired-wizard" });
    expect(heroPatch(lost, heroFields(lost))).toEqual({});
  });
});

describe("isDirty", () => {
  it("tells whether any field moved from its start", () => {
    const start = heroFields(undefined);
    expect(isDirty(start, { ...start })).toBe(false);
    expect(isDirty(start, { ...start, name: "A" })).toBe(true);
  });
});

describe("rosterIndex", () => {
  it("puts no pick on Neutral", () => {
    expect(rosterIndex(HERO_MINIS, "")).toEqual({ index: 0, missing: false });
  });

  it("finds a pick in the roster", () => {
    const pick = HERO_MINIS[2];
    expect(rosterIndex(HERO_MINIS, pick.id)).toEqual({ index: 2, missing: false });
    expect(miniValue(HERO_MINIS[rosterIndex(HERO_MINIS, pick.id).index])).toBe(pick.id);
  });

  it("shows a pick that isn't in the roster as missing, on Neutral", () => {
    expect(rosterIndex(HERO_MINIS, "retired-wizard")).toEqual({ index: 0, missing: true });
  });

  it("writes Neutral as no pick", () => {
    expect(miniValue(HERO_MINIS[0])).toBe("");
  });
});

describe("wrapStep", () => {
  it("wraps around both ends", () => {
    expect(wrapStep(0, -1, 8)).toBe(7);
    expect(wrapStep(7, 1, 8)).toBe(0);
    expect(wrapStep(3, 1, 8)).toBe(4);
  });
});

describe("spawnPos", () => {
  const camera = { x: -600, y: -100, scale: 2 };
  const viewport = { width: 2000, height: 400 };

  it("spawns at the centre of the whole window", () => {
    expect(spawnPos(camera, viewport, () => 0.5)).toEqual({ x: -100, y: 0 });
  });

  it("adds bounded jitter on both axes", () => {
    expect(spawnPos(camera, viewport, () => 0)).toEqual({ x: -100 - SPAWN_JITTER, y: -SPAWN_JITTER });
    const p = spawnPos(camera, viewport, () => 0.999999);
    expect(p.x + 100).toBeCloseTo(SPAWN_JITTER, 0);
    expect(p.y).toBeCloseTo(SPAWN_JITTER, 0);
  });
});
