import type { Pos, World } from "@/lib/types";
import { engaged, getHero, getLivingMonster, getMonster, idle, replaceHero } from "./internal";

/**
 * Drop on a monster: append it to the hero's targets. An idle hero gets it as
 * main target; an engaged one keeps its targets and gains a secondary one.
 * No-op if it is already a target.
 */
export function addTarget(world: World, heroId: string, monsterId: string): World {
  const hero = getHero(world, heroId);
  getLivingMonster(world, monsterId);
  if (hero.targets.includes(monsterId)) return world;
  return replaceHero(world, engaged(hero, [...hero.targets, monsterId]));
}

/** Move an existing target to index 0. Throws if it is not a target. */
export function makeMain(world: World, heroId: string, monsterId: string): World {
  const hero = getHero(world, heroId);
  if (!hero.targets.includes(monsterId)) {
    throw new Error(`Hero "${heroId}" does not target "${monsterId}"`);
  }
  if (hero.targets[0] === monsterId) return world;
  return replaceHero(world, engaged(hero, [monsterId, ...hero.targets.filter((t) => t !== monsterId)]));
}

/**
 * Remove one target. No-op if it is not a target. If no targets remain,
 * the hero goes idle at the removed monster's `pos`.
 */
export function removeTarget(world: World, heroId: string, monsterId: string): World {
  const hero = getHero(world, heroId);
  const monster = getMonster(world, monsterId);
  if (!hero.targets.includes(monsterId)) return world;
  const targets = hero.targets.filter((t) => t !== monsterId);
  return replaceHero(world, targets.length ? engaged(hero, targets) : idle(hero, monster.pos));
}

/** Clear targets and stand at `pos`, as an idle hero dropped on empty ground does. */
export function setIdle(world: World, heroId: string, pos: Pos): World {
  return replaceHero(world, idle(getHero(world, heroId), pos));
}
