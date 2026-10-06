import type { Hero, Monster, Size, World } from "@/lib/types";

export function alive(monsters: Monster[]): Monster[] {
  return monsters.filter((m) => !m.slain);
}

/** Living monsters that no hero has in `targets` (main or secondary). */
export function unfought(world: World): Monster[] {
  const targeted = new Set(world.heroes.flatMap((h) => h.targets));
  return alive(world.monsters).filter((m) => !targeted.has(m.id));
}

const byId = (a: Hero, b: Hero) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Heroes fighting a monster. `main` = heroes whose first target it is,
 * `secondary` = heroes who have it as a secondary target. Both sorted by hero id.
 */
export function fightersOf(world: World, monsterId: string): { main: Hero[]; secondary: Hero[] } {
  const main: Hero[] = [];
  const secondary: Hero[] = [];
  for (const hero of world.heroes) {
    const index = hero.targets.indexOf(monsterId);
    if (index === 0) main.push(hero);
    else if (index > 0) secondary.push(hero);
  }
  return { main: main.sort(byId), secondary: secondary.sort(byId) };
}

/** A hero's class and guild as one phrase: "archer of Cloud", or just "archer" with no guild. */
export function roleOf(hero: Hero): string {
  return hero.guild ? `${hero.class} of ${hero.guild}` : hero.class;
}

const SIZE_NAMES: Record<Size, string> = { S: "small", M: "medium", L: "large", XL: "extra large" };

/** A monster size in words: "small", "medium", "large" or "extra large". */
export function sizeName(size: Size): string {
  return SIZE_NAMES[size];
}
