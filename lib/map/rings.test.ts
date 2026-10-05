import { describe, expect, it } from "vitest";
import { BASE_SQUASH, HERO_BASE_RADIUS, baseRim, monsterBaseRadius, onBase } from "./rings";

describe("monsterBaseRadius", () => {
  it("grows with monster size, and even a spider is bigger than a hero", () => {
    expect(monsterBaseRadius("S")).toBeGreaterThan(HERO_BASE_RADIUS);
    expect(monsterBaseRadius("S")).toBeLessThan(monsterBaseRadius("M"));
    expect(monsterBaseRadius("M")).toBeLessThan(monsterBaseRadius("L"));
    expect(monsterBaseRadius("L")).toBeLessThan(monsterBaseRadius("XL"));
  });
});

describe("base ellipse", () => {
  it("is squashed by sin 38 degrees", () => {
    expect(BASE_SQUASH).toBeCloseTo(0.6157, 4);
  });

  it("has its rim at the radius sideways and at radius * BASE_SQUASH up and down", () => {
    expect(baseRim(20, 1, 0)).toBeCloseTo(20);
    expect(baseRim(20, -1, 0)).toBeCloseTo(20);
    expect(baseRim(20, 0, 1)).toBeCloseTo(20 * BASE_SQUASH);
    const diagonal = baseRim(20, Math.SQRT1_2, Math.SQRT1_2);
    expect(diagonal).toBeGreaterThan(20 * BASE_SQUASH);
    expect(diagonal).toBeLessThan(20);
  });

  it("contains points on and inside the rim only", () => {
    const c = { x: 100, y: 50 };
    expect(onBase(c, 20, c)).toBe(true);
    expect(onBase(c, 20, { x: 120, y: 50 })).toBe(true);
    expect(onBase(c, 20, { x: 100, y: 50 + 20 * BASE_SQUASH })).toBe(true);
    expect(onBase(c, 20, { x: 100, y: 50 + 20 * BASE_SQUASH + 0.5 })).toBe(false);
    expect(onBase(c, 20, { x: 121, y: 50 })).toBe(false);
  });
});
