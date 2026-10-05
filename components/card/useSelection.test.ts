import { describe, expect, it } from "vitest";
import type { Monster, World } from "@/lib/types";
import { liveSelection } from "./useSelection";

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
