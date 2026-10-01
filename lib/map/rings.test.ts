import { describe, expect, it } from "vitest";
import { HERO_BASE_RADIUS, monsterBaseRadius, radiusFor, ringPositions } from "./rings";

describe("ringPositions", () => {
  const c = { x: 100, y: 50 };
  it("returns nothing for zero heroes", () => {
    expect(ringPositions(c, 0, 40)).toEqual([]);
  });
  it("starts at the top", () => {
    const [p] = ringPositions(c, 1, 40);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(10);
  });
  it("goes clockwise on screen (top, right, bottom, left)", () => {
    const ps = ringPositions(c, 4, 40);
    const expected = [
      { x: 100, y: 10 },
      { x: 140, y: 50 },
      { x: 100, y: 90 },
      { x: 60, y: 50 },
    ];
    ps.forEach((p, i) => {
      expect(p.x).toBeCloseTo(expected[i].x);
      expect(p.y).toBeCloseTo(expected[i].y);
    });
  });
  it("places every point on the circle", () => {
    for (const p of ringPositions(c, 7, 33)) {
      expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeCloseTo(33);
    }
  });
});

describe("radiusFor", () => {
  it("grows with monster size", () => {
    expect(radiusFor("S")).toBeLessThan(radiusFor("M"));
    expect(radiusFor("M")).toBeLessThan(radiusFor("L"));
    expect(radiusFor("L")).toBeLessThan(radiusFor("XL"));
  });
  it("keeps heroes clear of the monster base", () => {
    for (const s of ["S", "M", "L", "XL"] as const) {
      expect(radiusFor(s)).toBeGreaterThan(monsterBaseRadius(s) + HERO_BASE_RADIUS);
    }
  });
  it("widens for a crowd so heroes don't overlap", () => {
    const n = 20;
    const r = radiusFor("S", n);
    expect(r).toBeGreaterThan(radiusFor("S"));
    const [a, b] = ringPositions({ x: 0, y: 0 }, n, r);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * HERO_BASE_RADIUS);
  });
});
