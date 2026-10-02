import type { Pos, Size } from "@/lib/types";

/** Radius of a monster's round base, in world units. */
export const MONSTER_BASE_RADIUS: Record<Size, number> = { S: 26, M: 34, L: 44, XL: 58 };
/** Radius of a hero's round base, in world units. */
export const HERO_BASE_RADIUS = 18;

/**
 * The table is seen from 38 degrees above, so a round base shows as an ellipse
 * as wide as the base and BASE_SQUASH times as tall.
 */
export const BASE_SQUASH = Math.sin((38 * Math.PI) / 180);

export function monsterBaseRadius(size: Size): number {
  return MONSTER_BASE_RADIUS[size];
}

/** Distance from the centre of a base to its rim on screen, along the unit vector (ux, uy). */
export function baseRim(radius: number, ux: number, uy: number): number {
  return 1 / Math.hypot(ux / radius, uy / (radius * BASE_SQUASH));
}

/** Whether `point` is on the base (rim included) of a figure standing at `center`. */
export function onBase(center: Pos, radius: number, point: Pos): boolean {
  const dx = (point.x - center.x) / radius;
  const dy = (point.y - center.y) / (radius * BASE_SQUASH);
  return dx * dx + dy * dy <= 1 + 1e-9;
}
