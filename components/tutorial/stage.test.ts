import { describe, expect, it } from "vitest";
import type { World } from "@/lib/types";
import { assign, createHero, createMonster, deleteMonster, revive, slay } from "@/lib/domain";
import { tutorialStage } from "./stage";

const EMPTY: World = { monsters: [], heroes: [] };
const at = { x: 0, y: 0 };

const summon = (w: World, name: string) => createMonster(w, { name, size: "M", pos: at }).world;
const recruit = (w: World, name: string) => createHero(w, { name, class: "engineer", pos: at }).world;

describe("tutorialStage", () => {
  it("walks the four steps to victory, naming the figures", () => {
    let w = EMPTY;
    expect(tutorialStage(w)).toEqual({ step: "monster" });

    w = summon(w, "Flaky CI");
    expect(tutorialStage(w)).toMatchObject({ step: "hero", monster: { id: "flaky-ci" } });

    w = recruit(w, "Ana");
    expect(tutorialStage(w)).toMatchObject({ step: "assign", hero: { id: "ana" }, monster: { id: "flaky-ci" } });

    w = assign(w, "ana", "flaky-ci");
    expect(tutorialStage(w)).toMatchObject({ step: "slay", hero: { id: "ana" }, monster: { id: "flaky-ci" } });

    w = slay(w, "flaky-ci", "2026-10-06");
    expect(tutorialStage(w)).toMatchObject({ step: "victory", monster: { id: "flaky-ci" } });
  });

  it("follows the table when things happen out of order", () => {
    // A hero first: still step 1 until there is a monster.
    let w = recruit(EMPTY, "Ana");
    expect(tutorialStage(w).step).toBe("monster");
    w = summon(w, "Flaky CI");
    expect(tutorialStage(w).step).toBe("assign");
    // Deleting the only monster goes back to step 1.
    expect(tutorialStage(deleteMonster(w, "flaky-ci")).step).toBe("monster");
  });

  it("doesn't count a slain monster that nobody fought", () => {
    let w = summon(EMPTY, "Flaky CI");
    w = slay(w, "flaky-ci", "2026-10-06");
    expect(tutorialStage(w).step).toBe("monster");
  });

  it("talks about an unfought monster while there is one, and the engaged one when slaying", () => {
    let w = recruit(summon(summon(EMPTY, "Old"), "New"), "Ana");
    w = assign(w, "ana", "old");
    expect(tutorialStage(w)).toMatchObject({ step: "slay", monster: { id: "old" } });
    expect(tutorialStage(recruit(summon(EMPTY, "Old"), "Ana"))).toMatchObject({ step: "assign", monster: { id: "old" } });
  });

  it("goes back to slaying when the trophy is revived", () => {
    let w = assign(recruit(summon(EMPTY, "Flaky CI"), "Ana"), "ana", "flaky-ci");
    const before = w;
    w = slay(w, "flaky-ci", "2026-10-06");
    w = revive(w, "flaky-ci", [{ id: "ana", targets: before.heroes[0].targets }]);
    expect(tutorialStage(w).step).toBe("slay");
  });
});
