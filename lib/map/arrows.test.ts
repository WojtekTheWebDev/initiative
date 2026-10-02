import { describe, expect, it } from "vitest";
import { offscreenArrows, spreadAlongEdges } from "./arrows";

const viewport = { width: 400, height: 200 };
const camera = { x: 0, y: 0, scale: 1 };

describe("offscreenArrows", () => {
  it("skips targets on screen and pins the rest to the inset edge", () => {
    const arrows = offscreenArrows(
      [
        { id: "on", pos: { x: 100, y: 100 } },
        { id: "right", pos: { x: 2000, y: 100 } },
        { id: "up", pos: { x: 200, y: -900 } },
      ],
      camera,
      viewport,
      { margin: 20 },
    );
    expect(arrows.map((a) => a.id)).toEqual(["right", "up"]);
    expect(arrows[0]).toMatchObject({ x: 380, y: 100 });
    expect(arrows[0].angle).toBeCloseTo(0);
    expect(arrows[1]).toMatchObject({ x: 200, y: 20 });
    expect(arrows[1].angle).toBeCloseTo(-Math.PI / 2);
  });

  it("follows the camera: pan and zoom change which targets are off screen", () => {
    const targets = [{ id: "m", pos: { x: 1000, y: 100 } }];
    expect(offscreenArrows(targets, camera, viewport)).toHaveLength(1);
    // Zoomed out far enough, the whole span fits.
    expect(offscreenArrows(targets, { x: 0, y: 0, scale: 0.3 }, viewport)).toHaveLength(0);
    // Panned so the target is in the middle.
    expect(offscreenArrows(targets, { x: 800, y: 0, scale: 1 }, viewport)).toHaveLength(0);
  });

  it("nudges arrows that land on the same spot apart", () => {
    const arrows = offscreenArrows(
      [
        { id: "a", pos: { x: 5000, y: 100 } },
        { id: "b", pos: { x: 5000, y: 100 } },
        { id: "c", pos: { x: 5000, y: 101 } },
      ],
      camera,
      viewport,
      { margin: 20, gap: 30 },
    );
    const ys = arrows.map((a) => a.y).sort((p, q) => p - q);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(30 - 1e-9);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(30 - 1e-9);
    expect(arrows.every((a) => a.x === 380)).toBe(true);
  });
});

describe("spreadAlongEdges", () => {
  it("keeps arrows inside the edge when pushing near the end", () => {
    const out = spreadAlongEdges(
      [
        { id: "a", x: 380, y: 170, angle: 0 },
        { id: "b", x: 380, y: 172, angle: 0 },
      ],
      viewport,
      20,
      30,
    );
    expect(out.find((a) => a.id === "b")!.y).toBe(180);
    expect(out.find((a) => a.id === "a")!.y).toBe(150);
  });

  it("leaves arrows on different edges alone and keeps input order", () => {
    const input = [
      { id: "top", x: 200, y: 20, angle: -1 },
      { id: "left", x: 20, y: 100, angle: 3 },
    ];
    expect(spreadAlongEdges(input, viewport, 20, 30)).toEqual(input);
  });

  it("does not mutate the input", () => {
    const input = [
      { id: "a", x: 100, y: 20, angle: 0 },
      { id: "b", x: 100, y: 20, angle: 0 },
    ];
    spreadAlongEdges(input, viewport, 20, 30);
    expect(input[1].x).toBe(100);
  });
});
