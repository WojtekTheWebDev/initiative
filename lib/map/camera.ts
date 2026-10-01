import type { Pos } from "@/lib/types";

/**
 * Camera: the world point shown at the top-left of the viewport, plus zoom.
 * `scale` is screen pixels per world unit (2 = zoomed in, 0.5 = zoomed out).
 */
export type Camera = { x: number; y: number; scale: number };

/** Viewport size in screen pixels. */
export type ViewportSize = { width: number; height: number };

/** A rectangle in world units, as used by the SVG `viewBox` attribute. */
export type ViewBox = { x: number; y: number; width: number; height: number };

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;
/** Zoom used when flying to a single point, unless already closer. */
export const READABLE_SCALE = 1;
/** fitBounds never zooms in past this, so a tight cluster stays readable. */
export const FIT_MAX_SCALE = 1.5;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function viewBoxOf(camera: Camera, viewport: ViewportSize): ViewBox {
  return {
    x: camera.x,
    y: camera.y,
    width: viewport.width / camera.scale,
    height: viewport.height / camera.scale,
  };
}

/** Formats a ViewBox for the SVG `viewBox` attribute. */
export function viewBoxAttr(vb: ViewBox): string {
  return `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
}

/** `screen` is relative to the canvas element's top-left corner. */
export function screenToWorld(camera: Camera, screen: Pos): Pos {
  return {
    x: camera.x + screen.x / camera.scale,
    y: camera.y + screen.y / camera.scale,
  };
}

export function worldToScreen(camera: Camera, world: Pos): Pos {
  return {
    x: (world.x - camera.x) * camera.scale,
    y: (world.y - camera.y) * camera.scale,
  };
}

/** A camera at `scale` with `point` in the middle of the viewport. */
export function centerOn(point: Pos, scale: number, viewport: ViewportSize): Camera {
  const s = clampScale(scale);
  return {
    x: point.x - viewport.width / 2 / s,
    y: point.y - viewport.height / 2 / s,
    scale: s,
  };
}

/** Zooms by `factor`, keeping the world point under `screen` fixed. Scale is clamped. */
export function zoomAt(camera: Camera, screen: Pos, factor: number): Camera {
  const scale = clampScale(camera.scale * factor);
  if (scale === camera.scale) return camera;
  const anchor = screenToWorld(camera, screen);
  return {
    x: anchor.x - screen.x / scale,
    y: anchor.y - screen.y / scale,
    scale,
  };
}

/** Moves the camera so the content follows a drag of (dx, dy) screen pixels. */
export function panBy(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x - dx / camera.scale, y: camera.y - dy / camera.scale };
}

/**
 * A camera that shows every point, with `padding` screen pixels around them.
 * No points: centered on the origin at scale 1. One point: centered on it at scale 1.
 */
export function fitBounds(points: Pos[], viewport: ViewportSize, padding = 80): Camera {
  if (points.length === 0) return centerOn({ x: 0, y: 0 }, 1, viewport);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const bw = maxX - minX;
  const bh = maxY - minY;
  const availW = Math.max(1, viewport.width - 2 * padding);
  const availH = Math.max(1, viewport.height - 2 * padding);
  const sx = bw > 0 ? availW / bw : Infinity;
  const sy = bh > 0 ? availH / bh : Infinity;
  const fit = Math.min(sx, sy);
  const scale = Number.isFinite(fit) ? Math.min(FIT_MAX_SCALE, fit) : READABLE_SCALE;
  return centerOn(center, scale, viewport);
}

/** Centers on `point` at a readable zoom: keeps the current zoom if it is already closer. */
export function flyTarget(camera: Camera, point: Pos, viewport: ViewportSize): Camera {
  return centerOn(point, Math.max(camera.scale, READABLE_SCALE), viewport);
}

/** Linear interpolation between cameras; zoom interpolates geometrically. */
export function lerpCamera(from: Camera, to: Camera, t: number): Camera {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    scale: from.scale * Math.pow(to.scale / from.scale, t),
  };
}
