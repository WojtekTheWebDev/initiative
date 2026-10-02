import { describe, expect, it } from "vitest";
import { HERO_BASE_RADIUS, monsterBaseRadius } from "./rings";

describe("monsterBaseRadius", () => {
  it("grows with monster size, and even a goblin is bigger than a hero", () => {
    expect(monsterBaseRadius("S")).toBeGreaterThan(HERO_BASE_RADIUS);
    expect(monsterBaseRadius("S")).toBeLessThan(monsterBaseRadius("M"));
    expect(monsterBaseRadius("M")).toBeLessThan(monsterBaseRadius("L"));
    expect(monsterBaseRadius("L")).toBeLessThan(monsterBaseRadius("XL"));
  });
});
