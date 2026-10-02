import { expect } from "vitest";
import type { World } from "@/lib/types";
import { validateWorld } from "./validate";

/** A small world: m1, m2 and m3 living, m4 slain. */
export function makeWorld(): World {
  return {
    monsters: [
      { id: "m1", name: "One", size: "S", pos: { x: -100, y: 10 } },
      { id: "m2", name: "Two", size: "M", pos: { x: -200, y: 20 }, notes: "n" },
      { id: "m3", name: "Three", size: "L", pos: { x: 300, y: 30 } },
      { id: "m4", name: "Four", size: "XL", pos: { x: 0, y: 40 }, slain: "2026-09-01" },
    ],
    heroes: [
      { id: "ana", name: "Ana", class: "archer", targets: ["m1", "m2"] },
      { id: "bob", name: "Bob", class: "mage", targets: ["m1"] },
      { id: "cid", name: "Cid", class: "rogue", targets: [], pos: { x: 5, y: 5 } },
    ],
  };
}

export function expectValid(world: World) {
  expect(validateWorld(world)).toEqual([]);
}
