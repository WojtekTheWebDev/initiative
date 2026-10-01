import type { Monster, Pos, World } from "@/lib/types";
import { engaged, getMonster, idle, replaceMonster } from "./internal";

/**
 * Remove a monster id from every hero. The next target becomes main;
 * a hero left with no targets goes idle at the monster's last `pos`.
 */
function cleanupTargets(world: World, monster: Monster): World {
  return {
    ...world,
    heroes: world.heroes.map((hero) => {
      if (!hero.targets.includes(monster.id)) return hero;
      const targets = hero.targets.filter((t) => t !== monster.id);
      return targets.length ? engaged(hero, targets) : idle(hero, monster.pos);
    }),
  };
}

/** Set `slain: today` ('YYYY-MM-DD') and clean up targets. Already slain: no-op. */
export function slay(world: World, monsterId: string, today: string): World {
  const monster = getMonster(world, monsterId);
  if (monster.slain) return world;
  const slain = { ...monster, slain: today };
  return cleanupTargets(replaceMonster(world, slain), slain);
}

/** Remove the monster entirely and clean up targets. */
export function deleteMonster(world: World, monsterId: string): World {
  const monster = getMonster(world, monsterId);
  const without = { ...world, monsters: world.monsters.filter((m) => m.id !== monsterId) };
  return cleanupTargets(without, monster);
}

export function moveMonster(world: World, monsterId: string, pos: Pos): World {
  const monster = getMonster(world, monsterId);
  return replaceMonster(world, { ...monster, pos: { x: pos.x, y: pos.y } });
}
