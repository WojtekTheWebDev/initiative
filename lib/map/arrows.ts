import type { Pos } from "@/lib/types";
import { worldToScreen, type Camera, type ViewportSize } from "./camera";
import { edgeArrow } from "./edge";

/** Something to point at: an id plus a world position. */
export type ArrowTarget = { id: string; pos: Pos };

/** An off-screen indicator in screen pixels (relative to the canvas), pointing at `angle` (radians, 0 = right, clockwise). */
export type ScreenArrow = { id: string; x: number; y: number; angle: number };

export type ArrowOptions = {
  /** Screen px between the viewport edge and an arrow's center. */
  margin?: number;
  /** Minimum screen px between two arrows' centers along the same edge. */
  gap?: number;
};

type Edge = "top" | "right" | "bottom" | "left";

/**
 * One arrow per target whose position is outside the viewport, pinned to the
 * viewport edge (inset by `margin`) and pointing toward the target. Arrows that
 * land on the same edge closer than `gap` are nudged apart along that edge;
 * each keeps its own angle. Output keeps the input order.
 */
export function offscreenArrows(
  targets: ArrowTarget[],
  camera: Camera,
  viewport: ViewportSize,
  { margin = 22, gap = 30 }: ArrowOptions = {},
): ScreenArrow[] {
  const box = { x: 0, y: 0, width: viewport.width, height: viewport.height };
  const arrows: ScreenArrow[] = [];
  for (const t of targets) {
    const a = edgeArrow(worldToScreen(camera, t.pos), box, margin);
    if (a) arrows.push({ id: t.id, ...a });
  }
  return spreadAlongEdges(arrows, viewport, margin, gap);
}

/** Which inset edge an arrow sits on (the nearest one; corners go to whichever is closer). */
function edgeOf(a: Pos, viewport: ViewportSize, margin: number): Edge {
  const d: Record<Edge, number> = {
    top: Math.abs(a.y - margin),
    bottom: Math.abs(viewport.height - margin - a.y),
    left: Math.abs(a.x - margin),
    right: Math.abs(viewport.width - margin - a.x),
  };
  return (Object.keys(d) as Edge[]).reduce((best, e) => (d[e] < d[best] ? e : best));
}

/**
 * Pushes arrows on the same edge at least `gap` apart, staying within the edge
 * where possible (if there are too many to fit, they overlap at the end).
 */
export function spreadAlongEdges(
  arrows: ScreenArrow[],
  viewport: ViewportSize,
  margin: number,
  gap: number,
): ScreenArrow[] {
  const out = arrows.map((a) => ({ ...a }));
  const groups = new Map<Edge, ScreenArrow[]>();
  for (const a of out) {
    const e = edgeOf(a, viewport, margin);
    groups.set(e, [...(groups.get(e) ?? []), a]);
  }
  for (const [edge, group] of groups) {
    if (group.length < 2) continue;
    const horizontal = edge === "top" || edge === "bottom";
    const axis = horizontal ? "x" : "y";
    const lo = margin;
    const hi = Math.max(lo, (horizontal ? viewport.width : viewport.height) - margin);
    // Stable order: by position, then id, so equal positions don't flicker.
    group.sort((a, b) => a[axis] - b[axis] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    // Forward sweep pushes later arrows right/down; backward sweep pulls them back inside.
    for (let i = 1; i < group.length; i++) {
      group[i][axis] = Math.max(group[i][axis], group[i - 1][axis] + gap);
    }
    group[group.length - 1][axis] = Math.min(group[group.length - 1][axis], hi);
    for (let i = group.length - 2; i >= 0; i--) {
      group[i][axis] = Math.min(group[i][axis], group[i + 1][axis] - gap);
    }
    for (const a of group) a[axis] = Math.max(lo, a[axis]);
  }
  return out;
}
