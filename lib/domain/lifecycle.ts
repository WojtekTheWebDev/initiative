import type { Hero, Monster, Pos, World } from "@/lib/types";
import { engaged, getMonster, idle, replaceHero, replaceMonster } from "./internal";

/** What a slay changed for one hero, so it can be undone. */
export type HeroBefore = { id: string; targets: string[]; pos?: Pos };

/** The hero with `monsterId` removed: the next target becomes main, or it goes idle at `at`. */
function withoutTarget(hero: Hero, monsterId: string, at: Pos): Hero {
  const targets = hero.targets.filter((t) => t !== monsterId);
  return targets.length ? engaged(hero, targets) : idle(hero, at);
}

/**
 * Remove a monster id from every hero. The next target becomes main;
 * a hero left with no targets goes idle at the monster's last `pos`.
 */
function cleanupTargets(world: World, monster: Monster): World {
  return {
    ...world,
    heroes: world.heroes.map((hero) =>
      hero.targets.includes(monster.id) ? withoutTarget(hero, monster.id, monster.pos) : hero,
    ),
  };
}

/** Heroes targeting the monster: main fighters first, then secondary, each group by id. */
function fightersOf(world: World, monsterId: string): string[] {
  const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const main: string[] = [];
  const secondary: string[] = [];
  for (const hero of world.heroes) {
    if (hero.targets[0] === monsterId) main.push(hero.id);
    else if (hero.targets.includes(monsterId)) secondary.push(hero.id);
  }
  return [...main.sort(byId), ...secondary.sort(byId)];
}

/**
 * Sets `slain: today` ('YYYY-MM-DD') and `slainBy` (absent when nobody fought it),
 * then cleans up targets. Already slain: no-op.
 */
export function slay(world: World, monsterId: string, today: string): World {
  const monster = getMonster(world, monsterId);
  if (monster.slain) return world;
  const slainBy = fightersOf(world, monsterId);
  const slain: Monster = { ...monster, slain: today };
  if (slainBy.length) slain.slainBy = slainBy;
  else delete slain.slainBy;
  return cleanupTargets(replaceMonster(world, slain), slain);
}

const samePos = (a: Pos | undefined, b: Pos | undefined) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y);

const sameHeroState = (a: { targets: string[]; pos?: Pos }, b: { targets: string[]; pos?: Pos }) =>
  a.targets.length === b.targets.length &&
  a.targets.every((t, i) => t === b.targets[i]) &&
  samePos(a.pos, b.pos);

/**
 * The heroes whose `targets` or `pos` differ between `before` and `after`,
 * as they were in `before`. Used to record what a slay changed.
 */
export function heroesChanged(before: World, after: World): HeroBefore[] {
  const next = new Map(after.heroes.map((h) => [h.id, h]));
  const changed: HeroBefore[] = [];
  for (const hero of before.heroes) {
    const now = next.get(hero.id);
    if (!now || sameHeroState(hero, now)) continue;
    const entry: HeroBefore = { id: hero.id, targets: [...hero.targets] };
    if (hero.pos) entry.pos = { x: hero.pos.x, y: hero.pos.y };
    changed.push(entry);
  }
  return changed;
}

/**
 * Clears `slain` and `slainBy`. Each hero in `before` gets its targets and pos back
 * only if it still looks exactly the way the slay left it; otherwise it is left alone.
 * Not slain: no-op.
 */
export function revive(world: World, monsterId: string, before: HeroBefore[]): World {
  const monster = getMonster(world, monsterId);
  if (!monster.slain) return world;
  const alive = { ...monster };
  delete alive.slain;
  delete alive.slainBy;
  let next = replaceMonster(world, alive);

  for (const old of before) {
    const hero = next.heroes.find((h) => h.id === old.id);
    if (!hero) continue;
    const leftBySlay = withoutTarget({ ...hero, ...old }, monsterId, monster.pos);
    if (!sameHeroState(hero, leftBySlay)) continue;
    if (old.targets.length) next = replaceHero(next, engaged(hero, [...old.targets]));
    else if (old.pos) next = replaceHero(next, idle(hero, old.pos));
  }
  return next;
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
