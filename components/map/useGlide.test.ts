import { describe, expect, it } from "vitest";
import type { WorldLayout } from "@/lib/map/layout";
import type { Hero, Monster } from "@/lib/types";
import { drawnFrame } from "./useGlide";

const monster: Monster = { id: "orc", name: "Orc", size: "M", pos: { x: 0, y: 0 } };
const hero = (targets: string[]): Hero => ({ id: "ada", name: "Ada", class: "x", targets });
const layoutWith = (heroX: number, targets: string[]): WorldLayout => ({
  monsters: [{ monster, pos: { x: 0, y: 0 }, radius: 40, unfought: targets.length === 0 }],
  heroes: [{ hero: hero(targets), pos: { x: heroX, y: 0 }, targets }],
});

describe("drawnFrame", () => {
  const dragFrame = layoutWith(5, []);
  const dropped = layoutWith(-120, ["orc"]);
  const follow = { at: new Map([["h:ada", { x: 5, y: 0 }]]), to: dragFrame, lifted: "h:ada" };

  it("draws the follow while its figure is lifted", () => {
    expect(drawnFrame(dragFrame, "h:ada", null, follow).heroes[0].pos.x).toBe(5);
  });

  it("never draws a finished drag's follow once the figure is let go", () => {
    expect(drawnFrame(dropped, null, null, follow)).toBe(dropped);
  });

  it("draws a glide only toward the layout it was started for", () => {
    const glide = { from: new Map([["h:ada", { x: 5, y: 0 }]]), to: dropped, t: 0 };
    expect(drawnFrame(dropped, null, glide, null).heroes[0].pos.x).toBe(5);
    const later = layoutWith(-130, ["orc"]);
    expect(drawnFrame(later, null, glide, null)).toBe(later);
  });
});
