import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import type { Hero, Monster } from "@/lib/types";

const load = <T,>(file: string): T[] =>
  parse(readFileSync(new URL(`../data.example/${file}`, import.meta.url), "utf8"));

describe("data.example", () => {
  const monsters = load<Monster>("monsters.yaml");
  const heroes = load<Hero>("heroes.yaml");
  const ids = new Set(monsters.map((m) => m.id));

  it("keeps slain as a plain date string", () => {
    expect(monsters.find((m) => m.slain)?.slain).toBe("2026-09-28");
  });

  it("covers every size", () => {
    expect(new Set(monsters.map((m) => m.size))).toEqual(new Set(["S", "M", "L", "XL"]));
  });

  it("stores pos only for idle heroes and targets only living monsters", () => {
    const living = new Set(monsters.filter((m) => !m.slain).map((m) => m.id));
    for (const h of heroes) {
      expect(h.pos === undefined).toBe(h.targets.length > 0);
      for (const t of h.targets) {
        expect(ids.has(t)).toBe(true);
        expect(living.has(t)).toBe(true);
      }
    }
  });
});
