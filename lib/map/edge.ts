import type { Pos } from "@/lib/types";
import type { ViewBox } from "./camera";

/** Where to pin an off-screen indicator, and which way it points (radians, 0 = right, clockwise). */
export type EdgeArrow = { x: number; y: number; angle: number };

/**
 * For a point outside `viewBox`, the spot on the box's edge (inset by `margin`)
 * along the line from the box center to the point, plus the angle of that line.
 * Returns `null` when the point is on screen.
 *
 * Unit-agnostic: pass world point + world viewBox (margin in world units), or a
 * screen point + `{ x: 0, y: 0, width, height }` (margin in pixels).
 */
export function edgeArrow(point: Pos, viewBox: ViewBox, margin = 0): EdgeArrow | null {
  const { x, y, width, height } = viewBox;
  if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height) {
    return null;
  }
  const cx = x + width / 2;
  const cy = y + height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const angle = Math.atan2(dy, dx);
  const hw = Math.max(0, width / 2 - margin);
  const hh = Math.max(0, height / 2 - margin);
  // Scale the direction so it just touches the inset box.
  const tx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const ty = dy === 0 ? Infinity : hh / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t, angle };
}
