import { describe, expect, it } from "vitest";
import { FALLBACK_HERO_GLYPH, HERO_CLASSES, heroGlyph, monsterGlyph } from "./glyphs";

describe("monsterGlyph", () => {
  it("has a distinct glyph per size", () => {
    const glyphs = (["S", "M", "L", "XL"] as const).map(monsterGlyph);
    expect(new Set(glyphs).size).toBe(4);
    expect(monsterGlyph("XL")).toBe("🐉");
  });
});

describe("heroGlyph", () => {
  it("maps known classes", () => {
    expect(heroGlyph("archer")).toBe("🏹");
    expect(heroGlyph("mage")).toBe("🧙");
    expect(heroGlyph("commander")).toBe("👑");
  });
  it("ignores case and whitespace, and knows aliases", () => {
    expect(heroGlyph("  Archer ")).toBe("🏹");
    expect(heroGlyph("Wizard")).toBe(heroGlyph("mage"));
  });
  it("falls back for unknown labels", () => {
    expect(heroGlyph("product owner")).toBe(FALLBACK_HERO_GLYPH);
    expect(heroGlyph("")).toBe(FALLBACK_HERO_GLYPH);
    expect(heroGlyph("constructor")).toBe(FALLBACK_HERO_GLYPH);
  });
  it("exposes every known class with its own glyph", () => {
    expect(HERO_CLASSES).toContain("warrior");
    for (const c of HERO_CLASSES) expect(heroGlyph(c)).not.toBe(FALLBACK_HERO_GLYPH);
  });
});
