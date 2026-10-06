import type { Hero, Monster, Pos, Size, World } from "@/lib/types";
import { getHero, getMonster, replaceHero, replaceMonster } from "./internal";

/** Lowercase ASCII slug: "Search Rewrite!" -> "search-rewrite". May be "". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[łŁ]/g, "l")
    .replace(/[øØ]/g, "o")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `base`, then `base-2`, `base-3`, ... until it does not clash. */
export function uniqueId(base: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function idFor(name: string, fallback: string, existing: { id: string }[]): string {
  return uniqueId(slugify(name) || fallback, existing.map((e) => e.id));
}

/** Set or remove an optional text field: "" / whitespace removes it. */
function withNotes(monster: Monster, notes: string | undefined): Monster {
  const next = { ...monster };
  if (notes === undefined || notes.trim() === "") delete next.notes;
  else next.notes = notes;
  return next;
}

/**
 * Set or remove a figure's mini: "" / whitespace removes it, so a hero is
 * drawn as the neutral adventurer and a monster as the mini for its size.
 */
function withMini<F extends Hero | Monster>(figure: F, mini: string | undefined): F {
  const next = { ...figure };
  if (mini === undefined || mini.trim() === "") delete next.mini;
  else next.mini = mini.trim();
  return next;
}

/** Set or remove a hero's guild: "" / whitespace removes it. */
function withGuild(hero: Hero, guild: string | undefined): Hero {
  const next = { ...hero };
  if (guild === undefined || guild.trim() === "") delete next.guild;
  else next.guild = guild.trim();
  return next;
}

export type CreateMonsterInput = { name: string; size: Size; mini?: string; notes?: string; pos: Pos };

export function createMonster(world: World, input: CreateMonsterInput): { world: World; id: string } {
  const id = idFor(input.name, "monster", world.monsters);
  const monster = withNotes(
    withMini({ id, name: input.name, size: input.size, pos: { x: input.pos.x, y: input.pos.y } }, input.mini),
    input.notes,
  );
  return { world: { ...world, monsters: [...world.monsters, monster] }, id };
}

export type CreateHeroInput = { name: string; class: string; guild?: string; mini?: string; pos: Pos };

export function createHero(world: World, input: CreateHeroInput): { world: World; id: string } {
  const id = idFor(input.name, "hero", world.heroes);
  const hero = withMini(
    withGuild({ id, name: input.name, class: input.class, targets: [], pos: { x: input.pos.x, y: input.pos.y } }, input.guild),
    input.mini,
  );
  return { world: { ...world, heroes: [...world.heroes, hero] }, id };
}

export type MonsterPatch = { name?: string; size?: Size; mini?: string; notes?: string };

/** Absent keys stay unchanged; `mini: ""` removes the pick and `notes: ""` the notes. The id never changes. */
export function updateMonster(world: World, monsterId: string, patch: MonsterPatch): World {
  let monster = { ...getMonster(world, monsterId) };
  if (patch.name !== undefined) monster.name = patch.name;
  if (patch.size !== undefined) monster.size = patch.size;
  if ("mini" in patch) monster = withMini(monster, patch.mini);
  if ("notes" in patch) monster = withNotes(monster, patch.notes);
  return replaceMonster(world, monster);
}

export type HeroPatch = { name?: string; class?: string; guild?: string; mini?: string };

/** Absent keys stay unchanged; `guild: ""` removes the guild and `mini: ""` the pick. The id never changes. */
export function updateHero(world: World, heroId: string, patch: HeroPatch): World {
  let hero = { ...getHero(world, heroId) };
  if (patch.name !== undefined) hero.name = patch.name;
  if (patch.class !== undefined) hero.class = patch.class;
  if ("guild" in patch) hero = withGuild(hero, patch.guild);
  if ("mini" in patch) hero = withMini(hero, patch.mini);
  return replaceHero(world, hero);
}

export function deleteHero(world: World, heroId: string): World {
  getHero(world, heroId);
  return { ...world, heroes: world.heroes.filter((h) => h.id !== heroId) };
}
