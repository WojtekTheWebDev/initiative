import type { Pos, World } from "@/lib/types";
import { engaged, getHero, getLivingMonster, getMonster, idle, replaceHero } from "./internal";

/** Plain drop: targets become just this monster; `pos` is dropped. */
export function assign(world: World, heroId: string, monsterId: string): World {
  const hero = getHero(world, heroId);
  getLivingMonster(world, monsterId);
  return replaceHero(world, engaged(hero, [monsterId]));
}

/**
 * Shift+drop: append the monster as a secondary target. No-op if already a target.
 * An idle hero gets it as main target instead.
 */
export function addSecondary(world: World, heroId: string, monsterId: string): World {
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

/** Drop on empty ground: clear targets and stand at `pos`. */
export function setIdle(world: World, heroId: string, pos: Pos): World {
  return replaceHero(world, idle(getHero(world, heroId), pos));
}
