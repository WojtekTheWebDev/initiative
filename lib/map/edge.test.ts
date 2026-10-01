import { describe, expect, it } from "vitest";
import { edgeArrow } from "./edge";

const vb = { x: 0, y: 0, width: 200, height: 100 };

describe("edgeArrow", () => {
  it("is null for a point on screen, edges included", () => {
    expect(edgeArrow({ x: 50, y: 50 }, vb, 10)).toBeNull();
    expect(edgeArrow({ x: 200, y: 100 }, vb, 10)).toBeNull();
  });
  it("pins to the right edge, pointing right", () => {
    const a = edgeArrow({ x: 1000, y: 50 }, vb, 10)!;
    expect(a.x).toBeCloseTo(190);
    expect(a.y).toBeCloseTo(50);
    expect(a.angle).toBeCloseTo(0);
  });
  it("pins to the top edge, pointing up", () => {
    const a = edgeArrow({ x: 100, y: -500 }, vb, 10)!;
    expect(a.x).toBeCloseTo(100);
    expect(a.y).toBeCloseTo(10);
    expect(a.angle).toBeCloseTo(-Math.PI / 2);
  });
  it("follows the line from the center for diagonal points", () => {
    const a = edgeArrow({ x: -100, y: 200 }, vb, 0)!;
    // center (100, 50), direction (-200, 150): bottom edge hit first (t = 1/3)
    expect(a.y).toBeCloseTo(100);
    expect(a.x).toBeCloseTo(100 - 200 / 3);
    expect(a.angle).toBeCloseTo(Math.atan2(150, -200));
  });
  it("works with an offset (world) viewBox", () => {
    const a = edgeArrow({ x: -5000, y: 0 }, { x: -1000, y: -500, width: 400, height: 1000 }, 20)!;
    expect(a.x).toBeCloseTo(-980);
    expect(a.angle).toBeCloseTo(Math.PI);
  });
});
