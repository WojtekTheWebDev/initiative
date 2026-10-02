import type { Pos } from "@/lib/types";
import type { Rect } from "./minis";
import { BASE_SQUASH } from "./rings";

/*
 * Name tags: slim dark tags in gold small capitals, hung just below the front
 * of a figure's base. Their size is worked out here, so the layout can keep
 * room for them, arrows can stop short of them and the map draws them the
 * same size.
 */

/** Name tags never get smaller than this on screen, however far you zoom out. */
export const TAG_MIN_PX = 10;
/** Font size of a monster's name tag, in world units at zoom 1. */
export const MONSTER_TAG_FONT = 11;
/** Below this zoom, hero tags are hidden so the map does not drown in text. */
export const HERO_TAG_MIN_SCALE = 0.45;
/** Font size of a hero's name tag, in world units at zoom 1. */
export const HERO_TAG_FONT = 10;
/** Rough width of one Cinzel character, as a share of the font size. */
const CHAR_WIDTH = 0.66;
/** Tag height and the space on each side of the text, as shares of the font size. */
const HEIGHT = 1.5;
const SIDE = 0.5;
/** Space between the front of the base and the tag: world units, but never less than this many screen px. */
const GAP = 4;
const GAP_PX = 3;

/** The tag's font size in world units at a zoom: `size`, or larger when that would be under TAG_MIN_PX on screen. */
export function tagFont(size: number, scale: number): number {
  return Math.max(size, TAG_MIN_PX / scale);
}

/** Where the tag reading `text` is drawn under a base of `radius` at `pos`, in world units, at zoom `scale`. */
export function tagRect(pos: Pos, radius: number, text: string, size: number, scale: number): Rect {
  const font = tagFont(size, scale);
  const width = text.length * font * CHAR_WIDTH + 2 * SIDE * font;
  return {
    x: pos.x - width / 2,
    y: pos.y + radius * BASE_SQUASH + Math.max(GAP, GAP_PX / scale),
    width,
    height: font * HEIGHT,
  };
}

/** What a hero's tag reads. */
export function heroTagText(name: string, idle: boolean): string {
  return idle ? `${name} · idle` : name;
}
