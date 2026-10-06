import type { Monster, Pos, Size } from "@/lib/types";
import manifest from "@/public/minis/manifest.json";
import { onBase } from "./rings";

/*
 * The painted miniatures, baked by `npm run bake:minis` into public/minis/
 * (images plus manifest.json). Heroes and monsters pick theirs with the
 * optional `mini` field. Every length here is in base radii, so a mini
 * scales with the base it stands on, and a monster mini can stand on a base
 * of any size.
 */

export type Rect = { x: number; y: number; width: number; height: number };

export type Mini = {
  id: string;
  name: string;
  /** Public URL of the baked image. */
  image: string;
  /** Image size, in base radii. */
  width: number;
  height: number;
  /** Where the centre of the base sits, in base radii from the image's top-left. */
  anchor: Pos;
  /** The model's silhouette without its base, in base radii from the image's top-left. */
  body: Rect;
};

type Entry = Omit<Mini, "id"> & { kind: string };

const ENTRIES = Object.entries(manifest as Record<string, Entry>)
  .map(([id, e]) => ({ id, ...e }))
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const toMini = ({ id, name, image, width, height, anchor, body }: Entry & { id: string }): Mini => ({
  id,
  name,
  image,
  width,
  height,
  anchor,
  body,
});

/** Id of the neutral adventurer, drawn for a hero with no `mini` or one that isn't in the roster. */
export const NEUTRAL_MINI = "neutral";

const heroEntries = ENTRIES.filter((e) => e.kind === "hero");
const neutral = heroEntries.find((e) => e.id === NEUTRAL_MINI);
if (!neutral) throw new Error(`public/minis/manifest.json has no "${NEUTRAL_MINI}" hero mini`);

/** Every hero mini, for the picker: the neutral adventurer first, then the rest by name. */
export const HERO_MINIS: readonly Mini[] = [
  toMini(neutral),
  ...heroEntries
    .filter((e) => e.id !== NEUTRAL_MINI)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toMini),
];

const heroById = new Map(HERO_MINIS.map((m) => [m.id, m]));

/** Whether `id` names a hero mini in the roster. */
export function isHeroMini(id: string | undefined): boolean {
  return id !== undefined && heroById.has(id);
}

/** The mini a hero is drawn as: its pick, or the neutral adventurer for a missing or unknown id. */
export function heroMini(id: string | undefined): Mini {
  return (id !== undefined && heroById.get(id)) || HERO_MINIS[0];
}

/** The bestiary, for the picker: every monster mini, by name. */
export const MONSTER_MINIS: readonly Mini[] = ENTRIES.filter((e) => e.kind === "monster")
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(toMini);

const monsterById = new Map(MONSTER_MINIS.map((m) => [m.id, m]));

/** The mini a monster stands as when it has no pick, or one that isn't in the bestiary. */
export const SIZE_MINI: Readonly<Record<Size, string>> = { S: "spider", M: "orc", L: "mushroom-king", XL: "dragon" };

for (const id of Object.values(SIZE_MINI)) {
  if (!monsterById.has(id)) throw new Error(`public/minis/manifest.json has no "${id}" monster mini`);
}

/** Whether `id` names a monster mini in the bestiary. */
export function isMonsterMini(id: string | undefined): boolean {
  return id !== undefined && monsterById.has(id);
}

/** The mini a monster stands as: its pick, or the mini for its size for a missing or unknown id. */
export function monsterMini(monster: Pick<Monster, "size" | "mini">): Mini {
  return (monster.mini !== undefined && monsterById.get(monster.mini)) || monsterById.get(SIZE_MINI[monster.size])!;
}

/** Where the image of a mini standing at `pos` on a base of `radius` is drawn, in world units. */
export function miniImageRect(mini: Mini, pos: Pos, radius: number): Rect {
  return {
    x: pos.x - mini.anchor.x * radius,
    y: pos.y - mini.anchor.y * radius,
    width: mini.width * radius,
    height: mini.height * radius,
  };
}

/** The model's body (its silhouette box, without the base) for a mini standing at `pos`, in world units. */
export function miniBodyRect(mini: Mini, pos: Pos, radius: number): Rect {
  return {
    x: pos.x + (mini.body.x - mini.anchor.x) * radius,
    y: pos.y + (mini.body.y - mini.anchor.y) * radius,
    width: mini.body.width * radius,
    height: mini.body.height * radius,
  };
}

/** A figure is hit on its base ellipse or on the body of its mini. */
export function hitsMini(mini: Mini, pos: Pos, radius: number, point: Pos): boolean {
  if (onBase(pos, radius, point)) return true;
  const b = miniBodyRect(mini, pos, radius);
  return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height;
}

/**
 * Painter's order: figures sorted by drawn y, so nearer minis (lower on the
 * screen) overlap farther ones. Ties keep their input order. The figure with
 * key `lifted` (being dragged) always goes last, on top.
 */
export function depthOrder<T>(items: readonly T[], pos: (item: T) => Pos, key: (item: T) => string, lifted: string | null): T[] {
  const indexed = items.map((item, i) => ({ item, i, y: pos(item).y, top: key(item) === lifted }));
  indexed.sort((a, b) => Number(a.top) - Number(b.top) || a.y - b.y || a.i - b.i);
  return indexed.map((x) => x.item);
}
