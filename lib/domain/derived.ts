import type { Hero, Monster, Pos, Size, Territory, World } from "@/lib/types";

/** x < 0 is the team battlefield; x >= 0 (including 0) is your keep. */
export function territoryOf(pos: Pos): Territory {
  return pos.x < 0 ? "team" : "keep";
}

export function alive(monsters: Monster[]): Monster[] {
  return monsters.filter((m) => !m.slain);
}

/** Living monsters that no hero has in `targets` (main or ghost). */
export function unfought(world: World): Monster[] {
  const targeted = new Set(world.heroes.flatMap((h) => h.targets));
  return alive(world.monsters).filter((m) => !targeted.has(m.id));
}

const byId = (a: Hero, b: Hero) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Heroes fighting a monster. `main` = heroes whose first target it is,
 * `ghosts` = heroes who have it as a secondary target. Both sorted by hero id.
 */
export function fightersOf(world: World, monsterId: string): { main: Hero[]; ghosts: Hero[] } {
  const main: Hero[] = [];
  const ghosts: Hero[] = [];
  for (const hero of world.heroes) {
    const index = hero.targets.indexOf(monsterId);
    if (index === 0) main.push(hero);
    else if (index > 0) ghosts.push(hero);
  }
  return { main: main.sort(byId), ghosts: ghosts.sort(byId) };
}

export type Creature = "goblin" | "orc" | "troll" | "dragon";

const CREATURES: Record<Size, Creature> = { S: "goblin", M: "orc", L: "troll", XL: "dragon" };

export function creatureOf(size: Size): Creature {
  return CREATURES[size];
}
