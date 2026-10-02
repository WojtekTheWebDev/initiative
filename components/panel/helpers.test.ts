import { describe, expect, it } from "vitest";
import type { Monster, World } from "@/lib/types";
import {
  BORDER_MARGIN,
  SPAWN_JITTER,
  heroSpawn,
  liveSelection,
  monsterSpawn,
  trophiesOf,
  visibleViewBox,
} from "./helpers";

const mid = () => 0.5; // no jitter
const low = () => 0; // jitter = -SPAWN_JITTER
const high = () => 0.999999; // jitter ~ +SPAWN_JITTER

const m = (id: string, extra: Partial<Monster> = {}): Monster => ({
  id,
  name: id,
  size: "M",
  pos: { x: 0, y: 0 },
  ...extra,
});

describe("liveSelection", () => {
  const world: World = {
    monsters: [m("a"), m("dead", { slain: "2026-01-01" })],
    heroes: [{ id: "h", name: "H", class: "mage", targets: ["a"] }],
  };

  it("keeps a living monster or an existing hero", () => {
    expect(liveSelection(world, { kind: "monster", id: "a" })).toEqual({ kind: "monster", id: "a" });
    expect(liveSelection(world, { kind: "hero", id: "h" })).toEqual({ kind: "hero", id: "h" });
  });

  it("drops slain, deleted or unknown items", () => {
    expect(liveSelection(world, { kind: "monster", id: "dead" })).toBeNull();
    expect(liveSelection(world, { kind: "monster", id: "gone" })).toBeNull();
    expect(liveSelection(world, { kind: "hero", id: "a" })).toBeNull();
    expect(liveSelection(world, null)).toBeNull();
  });
});

describe("trophiesOf", () => {
  it("lists only slain monsters, newest first, same day by name", () => {
    const list = trophiesOf([
      m("old", { slain: "2026-01-02" }),
      m("alive"),
      m("zed", { slain: "2026-03-01" }),
      m("abe", { slain: "2026-03-01" }),
      m("mid", { slain: "2026-02-10" }),
    ]);
    expect(list.map((x) => x.id)).toEqual(["abe", "zed", "mid", "old"]);
  });
});

describe("visibleViewBox", () => {
  it("leaves out the part covered on the right", () => {
    const vb = visibleViewBox({ x: 10, y: 20, scale: 2 }, { width: 1000, height: 600 }, 320);
    expect(vb).toEqual({ x: 10, y: 20, width: 340, height: 300 });
  });

  it("ignores the cover when the viewport is narrow", () => {
    const vb = visibleViewBox({ x: 0, y: 0, scale: 1 }, { width: 500, height: 400 }, 320);
    expect(vb.width).toBe(500);
  });
});

describe("monsterSpawn", () => {
  const both = { x: -600, y: -100, width: 1000, height: 200 }; // x from -600 to 400

  it("uses the centre of the visible part of each side", () => {
    expect(monsterSpawn(both, "team", mid)).toEqual({ x: -300, y: 0 });
    expect(monsterSpawn(both, "keep", mid)).toEqual({ x: 200, y: 0 });
  });

  it("clamps to the chosen side when the view shows only the other side", () => {
    const keepOnly = { x: 100, y: 0, width: 500, height: 100 };
    const teamOnly = { x: -900, y: 0, width: 500, height: 100 };
    for (const rand of [low, mid, high]) {
      expect(monsterSpawn(keepOnly, "team", rand).x).toBeLessThanOrEqual(-BORDER_MARGIN);
      expect(monsterSpawn(teamOnly, "keep", rand).x).toBeGreaterThanOrEqual(BORDER_MARGIN);
    }
  });

  it("keeps clear of the border when only a sliver of the side is visible", () => {
    const sliver = { x: -20, y: 0, width: 800, height: 100 };
    expect(monsterSpawn(sliver, "team", high).x).toBeLessThanOrEqual(-BORDER_MARGIN);
  });

  it("adds bounded jitter", () => {
    const a = monsterSpawn(both, "team", low);
    const b = monsterSpawn(both, "team", high);
    expect(Math.abs(a.x + 300)).toBe(SPAWN_JITTER);
    expect(a.y).toBe(-SPAWN_JITTER);
    expect(Math.abs(b.x + 300)).toBeCloseTo(SPAWN_JITTER, 0);
    expect(a.x).not.toBe(b.x);
  });

  it("still jitters spawns that were clamped, so they don't stack", () => {
    const teamOnly = { x: -900, y: 0, width: 500, height: 100 };
    const xs = [low, mid, high].map((r) => monsterSpawn(teamOnly, "keep", r).x);
    expect(new Set(xs).size).toBeGreaterThan(1);
    for (const x of xs) expect(x).toBeLessThanOrEqual(BORDER_MARGIN + SPAWN_JITTER);
  });

  it("always lands on the chosen territory", () => {
    for (let i = 0; i < 200; i++) {
      const view = {
        x: (Math.random() - 0.5) * 4000,
        y: 0,
        width: Math.random() * 2000 + 1,
        height: 100,
      };
      expect(monsterSpawn(view, "team").x).toBeLessThan(0);
      expect(monsterSpawn(view, "keep").x).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("heroSpawn", () => {
  it("spawns at the view centre", () => {
    expect(heroSpawn({ x: -100, y: 50, width: 400, height: 100 }, mid)).toEqual({ x: 100, y: 100 });
  });
});
