import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Size } from "@/lib/types";
import manifest from "@/public/minis/manifest.json";
import {
  HERO_MINIS,
  MONSTER_MINIS,
  NEUTRAL_MINI,
  SIZE_MINI,
  depthOrder,
  heroMini,
  hitsMini,
  isHeroMini,
  isMonsterMini,
  miniBodyRect,
  miniImageRect,
  monsterMini,
  type Mini,
} from "./minis";
import { BASE_SQUASH } from "./rings";

const SIZES: Size[] = ["S", "M", "L", "XL"];
const publicFile = (url: string) => path.join(__dirname, "../../public", url);
const entries = manifest as Record<string, { kind: string; image: string }>;

describe("the baked minis", () => {
  it("give every monster size its own mini from the bestiary", () => {
    const ids = SIZES.map((size) => monsterMini({ size }).id);
    expect(ids).toEqual(["spider", "orc", "mushroom-king", "dragon"]);
    expect(SIZES.map((s) => SIZE_MINI[s])).toEqual(ids);
    for (const id of ids) expect(isMonsterMini(id)).toBe(true);
  });

  it("list every monster mini in the bestiary, by name, each with an image", () => {
    const monsterIds = Object.entries(entries)
      .filter(([, e]) => e.kind === "monster")
      .map(([id]) => id);
    expect(MONSTER_MINIS.map((m) => m.id).sort()).toEqual(monsterIds.sort());
    const names = MONSTER_MINIS.map((m) => m.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    for (const m of MONSTER_MINIS) {
      expect(entries[m.id].image).toBe(m.image);
      expect(existsSync(publicFile(m.image))).toBe(true);
    }
  });

  it("list every hero mini in the roster, neutral first, each with an image", () => {
    expect(HERO_MINIS[0].id).toBe(NEUTRAL_MINI);
    const heroIds = Object.entries(entries)
      .filter(([, e]) => e.kind === "hero")
      .map(([id]) => id);
    expect(HERO_MINIS.map((m) => m.id).sort()).toEqual(heroIds.sort());
    for (const m of HERO_MINIS) {
      expect(entries[m.id].image).toBe(m.image);
      expect(readFileSync(publicFile(m.image)).subarray(8, 12).toString()).toBe("WEBP");
    }
  });

  it("have anchors and bodies inside their images", () => {
    for (const m of [...HERO_MINIS, ...MONSTER_MINIS]) {
      expect(m.anchor.x).toBeGreaterThan(0);
      expect(m.anchor.x).toBeLessThan(m.width);
      expect(m.anchor.y).toBeGreaterThan(0);
      expect(m.anchor.y).toBeLessThan(m.height);
      expect(m.body.x).toBeGreaterThanOrEqual(0);
      expect(m.body.y).toBeGreaterThanOrEqual(0);
      // The manifest rounds every length to 0.001, so the sums may be off by that much.
      expect(m.body.x + m.body.width).toBeLessThanOrEqual(m.width + 0.0015);
      expect(m.body.y + m.body.height).toBeLessThanOrEqual(m.height + 0.0015);
      // The figure stands up from its base.
      expect(m.body.y).toBeLessThan(m.anchor.y);
    }
  });
});

describe("monsterMini", () => {
  it("returns the picked mini, whatever the size", () => {
    const mimic = MONSTER_MINIS.find((m) => m.id === "mimic")!;
    for (const size of SIZES) expect(monsterMini({ size, mini: "mimic" })).toBe(mimic);
  });

  it("returns the mini for the size for a missing or unknown id", () => {
    expect(monsterMini({ size: "S" }).id).toBe("spider");
    expect(monsterMini({ size: "XL", mini: "unicorn" }).id).toBe("dragon");
    expect(monsterMini({ size: "M", mini: "" }).id).toBe("orc");
    expect(isMonsterMini("unicorn")).toBe(false);
    expect(isMonsterMini(undefined)).toBe(false);
  });

  it("never returns a hero", () => {
    expect(monsterMini({ size: "L", mini: "knight" }).id).toBe("mushroom-king");
    expect(isMonsterMini("knight")).toBe(false);
  });
});

describe("heroMini", () => {
  it("returns the picked mini", () => {
    const knight = HERO_MINIS.find((m) => m.id === "knight")!;
    expect(heroMini("knight")).toBe(knight);
    expect(isHeroMini("knight")).toBe(true);
  });

  it("returns the neutral adventurer for a missing or unknown id", () => {
    expect(heroMini(undefined).id).toBe(NEUTRAL_MINI);
    expect(heroMini("unicorn").id).toBe(NEUTRAL_MINI);
    expect(heroMini("").id).toBe(NEUTRAL_MINI);
    expect(isHeroMini("unicorn")).toBe(false);
    expect(isHeroMini(undefined)).toBe(false);
  });

  it("never returns a monster", () => {
    expect(heroMini("dragon").id).toBe(NEUTRAL_MINI);
    expect(isHeroMini("dragon")).toBe(false);
  });
});

/** A 2 x 3 mini whose base centre is at (1, 2.5) and whose body is the box (0.5, 0) to (1.5, 2.5). */
const tall: Mini = {
  id: "t",
  name: "Tall",
  image: "/t.webp",
  width: 2,
  height: 3,
  anchor: { x: 1, y: 2.5 },
  body: { x: 0.5, y: 0, width: 1, height: 2.5 },
};

describe("mini geometry", () => {
  it("places the image so the base centre lands on the figure's position", () => {
    expect(miniImageRect(tall, { x: 100, y: 200 }, 10)).toEqual({ x: 90, y: 175, width: 20, height: 30 });
    expect(miniBodyRect(tall, { x: 100, y: 200 }, 10)).toEqual({ x: 95, y: 175, width: 10, height: 25 });
  });

  it("is hit on the base ellipse or on the body, not on the empty corners of the image", () => {
    const pos = { x: 100, y: 200 };
    expect(hitsMini(tall, pos, 10, { x: 109, y: 200 })).toBe(true); // base, beside the body
    expect(hitsMini(tall, pos, 10, { x: 100, y: 176 })).toBe(true); // top of the head
    expect(hitsMini(tall, pos, 10, { x: 91, y: 177 })).toBe(false); // top-left corner of the image
    expect(hitsMini(tall, pos, 10, { x: 100, y: 200 + 10 * BASE_SQUASH + 1 })).toBe(false); // below the base
  });
});

describe("depthOrder", () => {
  const items = [
    { id: "a", pos: { x: 0, y: 30 } },
    { id: "b", pos: { x: 0, y: -10 } },
    { id: "c", pos: { x: 0, y: 30 } },
    { id: "d", pos: { x: 0, y: 0 } },
  ];
  const order = (lifted: string | null) =>
    depthOrder(items, (i) => i.pos, (i) => i.id, lifted).map((i) => i.id);

  it("draws farther (higher) figures first, ties in input order", () => {
    expect(order(null)).toEqual(["b", "d", "a", "c"]);
  });

  it("always draws the lifted figure last", () => {
    expect(order("b")).toEqual(["d", "a", "c", "b"]);
  });
});
