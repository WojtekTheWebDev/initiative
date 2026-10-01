import type { Hero, Monster, World } from "@/lib/types";

export function getHero(world: World, heroId: string): Hero {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero) throw new Error(`Unknown hero: "${heroId}"`);
  return hero;
}

export function getMonster(world: World, monsterId: string): Monster {
  const monster = world.monsters.find((m) => m.id === monsterId);
  if (!monster) throw new Error(`Unknown monster: "${monsterId}"`);
  return monster;
}

export function getLivingMonster(world: World, monsterId: string): Monster {
  const monster = getMonster(world, monsterId);
  if (monster.slain) throw new Error(`Monster "${monsterId}" is already slain`);
  return monster;
}

export function replaceHero(world: World, hero: Hero): World {
  return { ...world, heroes: world.heroes.map((h) => (h.id === hero.id ? hero : h)) };
}

export function replaceMonster(world: World, monster: Monster): World {
  return { ...world, monsters: world.monsters.map((m) => (m.id === monster.id ? monster : m)) };
}

/** Engaged hero: has targets and no `pos`. */
export function engaged(hero: Hero, targets: string[]): Hero {
  const rest = { ...hero };
  delete rest.pos;
  return { ...rest, targets };
}

/** Idle hero: no targets, standing at `pos`. */
export function idle(hero: Hero, pos: { x: number; y: number }): Hero {
  return { ...hero, targets: [], pos: { x: pos.x, y: pos.y } };
}
