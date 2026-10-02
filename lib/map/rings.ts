import type { Size } from "@/lib/types";

/** Radius of a monster's circle base, in world units. */
export const MONSTER_BASE_RADIUS: Record<Size, number> = { S: 26, M: 34, L: 44, XL: 58 };
/** Radius of a hero's circle base, in world units. */
export const HERO_BASE_RADIUS = 18;

export function monsterBaseRadius(size: Size): number {
  return MONSTER_BASE_RADIUS[size];
}
