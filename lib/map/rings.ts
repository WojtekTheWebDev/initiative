import type { Pos, Size } from "@/lib/types";

/** Radius of a monster's circle base, in world units. */
export const MONSTER_BASE_RADIUS: Record<Size, number> = { S: 26, M: 34, L: 44, XL: 58 };
/** Radius of a hero's circle base, in world units. */
export const HERO_BASE_RADIUS = 18;
/** Space between a monster base and the heroes ringed around it. */
const RING_GAP = 12;
/** Minimum space between neighbouring heroes on a ring. */
const HERO_GAP = 8;

export function monsterBaseRadius(size: Size): number {
  return MONSTER_BASE_RADIUS[size];
}

/**
 * Ring radius for heroes around a monster of `size`. Grows with size, and,
 * when `count` is given, also grows so that many heroes don't overlap.
 */
export function radiusFor(size: Size, count = 0): number {
  const base = MONSTER_BASE_RADIUS[size] + HERO_BASE_RADIUS + RING_GAP;
  const crowd = (count * (2 * HERO_BASE_RADIUS + HERO_GAP)) / (2 * Math.PI);
  return Math.max(base, crowd);
}

/**
 * `count` points evenly spaced on a circle, starting at the top and going
 * clockwise (on screen, where y grows downwards).
 */
export function ringPositions(center: Pos, count: number, radius: number): Pos[] {
  const out: Pos[] = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    out.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
  }
  return out;
}
