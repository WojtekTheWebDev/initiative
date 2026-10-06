import type { Hero, Monster, World } from "@/lib/types";
import { alive, unfought } from "@/lib/domain";

/**
 * Where the player is in the tutorial, worked out from the table alone, so
 * a reload resumes at the right step and the player may do things in any
 * order. Each stage names the figures its coach card talks about.
 *
 * 1. `monster`: no living monster yet.
 * 2. `hero`: a monster, but no hero.
 * 3. `assign`: no hero has a living target.
 * 4. `slay`: a hero fights a monster, which isn't slain yet.
 * 5. `victory`: a monster that a hero fought is a trophy. Slaying a monster
 *    nobody fought doesn't count, so the steps before it can't be skipped.
 */
export type TutorialStage =
  | { step: "monster" }
  | { step: "hero"; monster: Monster }
  | { step: "assign"; hero: Hero; monster: Monster }
  | { step: "slay"; hero: Hero; monster: Monster }
  | { step: "victory"; monster: Monster };

export type TutorialStep = TutorialStage["step"];

/** The steps the coach card counts ("Step 2 of 4"); victory comes after them. */
export const COACHED_STEPS: readonly TutorialStep[] = ["monster", "hero", "assign", "slay"];

export function tutorialStage(world: World): TutorialStage {
  const trophy = world.monsters.find((m) => m.slain && m.slainBy?.length);
  if (trophy) return { step: "victory", monster: trophy };

  const living = alive(world.monsters);
  if (living.length === 0) return { step: "monster" };
  // An unfought monster is the one to talk about while there is one.
  const monster = unfought(world)[0] ?? living[0];
  if (world.heroes.length === 0) return { step: "hero", monster };

  const livingIds = new Set(living.map((m) => m.id));
  for (const target of living) {
    const hero = world.heroes.find((h) => h.targets.some((t) => t === target.id && livingIds.has(t)));
    if (hero) return { step: "slay", hero, monster: target };
  }
  return { step: "assign", hero: world.heroes[0], monster };
}
