import { describe, expect, it } from "vitest";
import {
  FIT_MAX_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  centerOn,
  fitBounds,
  flyTarget,
  lerpCamera,
  panBy,
  screenToWorld,
  viewBoxAttr,
  viewBoxOf,
  worldToScreen,
  zoomAt,
  zoomAtCenter,
  ZOOM_STEP,
  type Camera,
} from "./camera";

const vp = { width: 800, height: 600 };

describe("viewBoxOf", () => {
  it("covers the viewport in world units", () => {
    expect(viewBoxOf({ x: -100, y: 50, scale: 2 }, vp)).toEqual({
      x: -100,
      y: 50,
      width: 400,
      height: 300,
    });
    expect(viewBoxAttr({ x: 1, y: 2, width: 3, height: 4 })).toBe("1 2 3 4");
  });
});

describe("screenToWorld / worldToScreen", () => {
  const cam: Camera = { x: -200, y: 100, scale: 0.5 };
  it("maps the top-left to the camera origin", () => {
    expect(screenToWorld(cam, { x: 0, y: 0 })).toEqual({ x: -200, y: 100 });
    expect(screenToWorld(cam, { x: 100, y: 50 })).toEqual({ x: 0, y: 200 });
  });
  it("round-trips", () => {
    const p = { x: 123.5, y: -42 };
    const back = screenToWorld(cam, worldToScreen(cam, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });
});

describe("zoomAt", () => {
  const cam: Camera = { x: -300, y: -200, scale: 1 };
  it("keeps the world point under the cursor fixed", () => {
    const cursor = { x: 250, y: 410 };
    const before = screenToWorld(cam, cursor);
    const zoomed = zoomAt(cam, cursor, 1.7);
    expect(zoomed.scale).toBeCloseTo(1.7);
    const after = screenToWorld(zoomed, cursor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
  it("clamps the scale", () => {
    expect(zoomAt(cam, { x: 0, y: 0 }, 100).scale).toBe(MAX_SCALE);
    expect(zoomAt(cam, { x: 0, y: 0 }, 0.0001).scale).toBe(MIN_SCALE);
  });
  it("stays anchored when the scale hits the clamp", () => {
    const cursor = { x: 400, y: 300 };
    const before = screenToWorld(cam, cursor);
    const after = screenToWorld(zoomAt(cam, cursor, 100), cursor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
  it("returns the same camera when already at the limit", () => {
    const max = { ...cam, scale: MAX_SCALE };
    expect(zoomAt(max, { x: 10, y: 10 }, 2)).toBe(max);
  });
});

describe("panBy", () => {
  it("moves content with the pointer", () => {
    const cam = { x: 0, y: 0, scale: 2 };
    const panned = panBy(cam, 100, -50);
    expect(panned).toEqual({ x: -50, y: 25, scale: 2 });
  });
});

describe("fitBounds", () => {
  const center = (c: Camera) => screenToWorld(c, { x: vp.width / 2, y: vp.height / 2 });

  it("centers on the origin when there are no points", () => {
    const cam = fitBounds([], vp);
    expect(cam.scale).toBe(1);
    expect(center(cam)).toEqual({ x: 0, y: 0 });
  });
  it("centers on a single point", () => {
    const cam = fitBounds([{ x: 300, y: -40 }], vp);
    expect(cam.scale).toBe(1);
    expect(center(cam)).toEqual({ x: 300, y: -40 });
  });
  it("fits every point inside the padded viewport", () => {
    const pts = [
      { x: -1000, y: -200 },
      { x: 1000, y: 300 },
      { x: 0, y: 0 },
    ];
    const pad = 50;
    const cam = fitBounds(pts, vp, pad);
    expect(cam.scale).toBeCloseTo((vp.width - 2 * pad) / 2000);
    for (const p of pts) {
      const s = worldToScreen(cam, p);
      expect(s.x).toBeGreaterThanOrEqual(pad - 1e-9);
      expect(s.x).toBeLessThanOrEqual(vp.width - pad + 1e-9);
      expect(s.y).toBeGreaterThanOrEqual(pad - 1e-9);
      expect(s.y).toBeLessThanOrEqual(vp.height - pad + 1e-9);
    }
    const c = center(cam);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(50);
  });
  it("is limited by the tighter axis", () => {
    const cam = fitBounds([{ x: 0, y: -1000 }, { x: 10, y: 1000 }], vp, 0);
    expect(cam.scale).toBeCloseTo(600 / 2000);
  });
  it("does not zoom in too far on a tight cluster", () => {
    const cam = fitBounds([{ x: 0, y: 0 }, { x: 5, y: 5 }], vp);
    expect(cam.scale).toBe(FIT_MAX_SCALE);
  });
  it("clamps to the minimum scale for huge spreads", () => {
    const cam = fitBounds([{ x: -1e6, y: 0 }, { x: 1e6, y: 0 }], vp);
    expect(cam.scale).toBe(MIN_SCALE);
  });
});

describe("flyTarget", () => {
  it("centers on the point at a readable zoom", () => {
    const cam = flyTarget({ x: 0, y: 0, scale: 0.2 }, { x: 500, y: 500 }, vp);
    expect(cam.scale).toBe(1);
    expect(screenToWorld(cam, { x: 400, y: 300 })).toEqual({ x: 500, y: 500 });
  });
  it("keeps a closer zoom", () => {
    expect(flyTarget({ x: 0, y: 0, scale: 2.5 }, { x: 0, y: 0 }, vp).scale).toBe(2.5);
  });
  it("brings the point to a given screen position", () => {
    const cam = flyTarget({ x: 0, y: 0, scale: 2 }, { x: 500, y: 500 }, vp, { x: 100, y: 50 });
    expect(cam.scale).toBe(2);
    expect(screenToWorld(cam, { x: 100, y: 50 })).toEqual({ x: 500, y: 500 });
  });
});

describe("centerOn / lerpCamera", () => {
  it("clamps scale", () => {
    expect(centerOn({ x: 0, y: 0 }, 99, vp).scale).toBe(MAX_SCALE);
  });
  it("interpolates endpoints exactly", () => {
    const a = { x: 0, y: 0, scale: 0.5 };
    const b = { x: 100, y: -100, scale: 2 };
    expect(lerpCamera(a, b, 0)).toEqual(a);
    const end = lerpCamera(a, b, 1);
    expect(end.x).toBeCloseTo(100);
    expect(end.scale).toBeCloseTo(2);
    expect(lerpCamera(a, b, 0.5).scale).toBeCloseTo(1);
  });
});

describe("zoomAtCenter", () => {
  const cam: Camera = { x: -200, y: 100, scale: 0.5 };
  const center = { x: vp.width / 2, y: vp.height / 2 };
  it("keeps the world point in the middle of the screen fixed", () => {
    const next = zoomAtCenter(cam, vp, ZOOM_STEP);
    expect(next.scale).toBeCloseTo(0.75);
    const before = screenToWorld(cam, center);
    const after = screenToWorld(next, center);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
  it("undoes itself with the inverse factor", () => {
    const back = zoomAtCenter(zoomAtCenter(cam, vp, ZOOM_STEP), vp, 1 / ZOOM_STEP);
    expect(back.x).toBeCloseTo(cam.x);
    expect(back.y).toBeCloseTo(cam.y);
    expect(back.scale).toBeCloseTo(cam.scale);
  });
  it("stops at the zoom limits", () => {
    expect(zoomAtCenter({ x: 0, y: 0, scale: MAX_SCALE }, vp, ZOOM_STEP).scale).toBe(MAX_SCALE);
    expect(zoomAtCenter({ x: 0, y: 0, scale: MIN_SCALE }, vp, 1 / ZOOM_STEP).scale).toBe(MIN_SCALE);
  });
});
