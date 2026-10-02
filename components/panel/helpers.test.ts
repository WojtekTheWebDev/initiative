import { describe, expect, it } from "vitest";
import type { Monster, World } from "@/lib/types";
import {
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
  const view = { x: -600, y: -100, width: 1000, height: 200 };

  it("spawns at the view centre", () => {
    expect(monsterSpawn(view, mid)).toEqual({ x: -100, y: 0 });
  });

  it("adds bounded jitter on both axes", () => {
    expect(monsterSpawn(view, low)).toEqual({ x: -100 - SPAWN_JITTER, y: -SPAWN_JITTER });
    const b = monsterSpawn(view, high);
    expect(b.x + 100).toBeCloseTo(SPAWN_JITTER, 0);
    expect(b.y).toBeCloseTo(SPAWN_JITTER, 0);
  });

  it("follows the view anywhere on the map", () => {
    for (const x of [-5000, -300, 0, 4000]) {
      const pos = monsterSpawn({ x, y: 0, width: 400, height: 100 });
      expect(pos.x).toBeGreaterThanOrEqual(x + 200 - SPAWN_JITTER);
      expect(pos.x).toBeLessThanOrEqual(x + 200 + SPAWN_JITTER);
    }
  });
});

describe("heroSpawn", () => {
  it("spawns at the view centre", () => {
    expect(heroSpawn({ x: -100, y: 50, width: 400, height: 100 }, mid)).toEqual({ x: 100, y: 100 });
  });
});
