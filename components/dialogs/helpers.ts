import type { Hero, Monster, Pos, Size } from "@/lib/types";
import { viewBoxOf, type Camera, type ViewportSize } from "@/lib/map/camera";
import { NEUTRAL_MINI, isHeroMini, type Mini } from "@/lib/map/minis";

/** The size slider's stops, smallest first. */
export const SIZES: readonly Size[] = ["S", "M", "L", "XL"];

export type MonsterFields = { name: string; size: Size; notes: string };
export type MonsterPatch = Partial<MonsterFields>;

/** The fields of a monster as the dialog edits them. */
export function monsterFields(monster: Monster | undefined): MonsterFields {
  return { name: monster?.name ?? "", size: monster?.size ?? "M", notes: monster?.notes ?? "" };
}

/** Only the fields that changed, so untouched YAML keeps its formatting. */
export function monsterPatch(monster: Monster, fields: MonsterFields): MonsterPatch {
  const patch: MonsterPatch = {};
  const name = fields.name.trim();
  if (name !== monster.name) patch.name = name;
  if (fields.size !== monster.size) patch.size = fields.size;
  if (fields.notes !== (monster.notes ?? "")) patch.notes = fields.notes;
  return patch;
}

/** `mini` is "" for none, which draws the neutral adventurer. */
export type HeroFields = { name: string; class: string; mini: string };
export type HeroPatch = Partial<HeroFields>;

/** The fields of a hero as the dialog edits them. */
export function heroFields(hero: Hero | undefined): HeroFields {
  return { name: hero?.name ?? "", class: hero?.class ?? "", mini: hero?.mini ?? "" };
}

/** Only the fields that changed: changing only the mini writes only `mini`. */
export function heroPatch(hero: Hero, fields: HeroFields): HeroPatch {
  const patch: HeroPatch = {};
  const name = fields.name.trim();
  const cls = fields.class.trim();
  if (name !== hero.name) patch.name = name;
  if (cls !== hero.class) patch.class = cls;
  if (fields.mini !== (hero.mini ?? "")) patch.mini = fields.mini;
  return patch;
}

/** Whether the dialog's fields differ from where they started, so a stray click must not throw them away. */
export function isDirty<F extends Record<string, string>>(start: F, now: F): boolean {
  return Object.keys(start).some((k) => start[k] !== now[k]);
}

/**
 * Where the carousel stands for a hero's `mini`: its index in the roster, and
 * whether the pick is missing from it (then Neutral, index 0, is shown).
 */
export function rosterIndex(roster: readonly Mini[], mini: string): { index: number; missing: boolean } {
  if (mini === "" || !isHeroMini(mini)) return { index: 0, missing: mini !== "" };
  return { index: Math.max(0, roster.findIndex((m) => m.id === mini)), missing: false };
}

/** The `mini` value for a roster entry: "" for Neutral. */
export function miniValue(mini: Mini): string {
  return mini.id === NEUTRAL_MINI ? "" : mini.id;
}

/** Steps `index` by `delta` through `count` items, wrapping around both ends. */
export function wrapStep(index: number, delta: number, count: number): number {
  return (((index + delta) % count) + count) % count;
}

/** Max random offset (world units, each axis) so new figures don't stack. */
export const SPAWN_JITTER = 30;

/** Where a new figure appears: the centre of the visible map (the whole window), plus jitter. */
export function spawnPos(camera: Camera, viewport: ViewportSize, rand: () => number = Math.random): Pos {
  const view = viewBoxOf(camera, viewport);
  const jitter = () => (rand() * 2 - 1) * SPAWN_JITTER;
  return {
    x: Math.round(view.x + view.width / 2 + jitter()),
    y: Math.round(view.y + view.height / 2 + jitter()),
  };
}
