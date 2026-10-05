import { describe, expect, it } from "vitest";
import type { Hero, Monster, World } from "@/lib/types";
import { PARTY_SHOWN, party, type PartyMember } from "./party";

const monster = (id: string, slain?: string): Monster => ({ id, name: id, size: "M", pos: { x: 0, y: 0 }, slain });
const hero = (id: string, name: string, targets: string[] = []): Hero => ({
  id,
  name,
  class: "rogue",
  targets,
  ...(targets.length ? {} : { pos: { x: 0, y: 0 } }),
});
const world = (heroes: Hero[], monsters: Monster[] = [monster("a"), monster("b"), monster("c")]): World => ({
  monsters,
  heroes,
});
const ids = (members: PartyMember[]) => members.map((m) => m.hero.id);

describe("party", () => {
  it("is empty with no heroes", () => {
    expect(party(world([]))).toEqual({ shown: [], folded: [], idle: 0 });
  });

  it("gives each hero their main target and a count of secondary ones", () => {
    const { shown } = party(world([hero("ana", "Ana", ["b", "a", "c"]), hero("bo", "Bo", ["c"])]));
    expect(shown.map((m) => [m.hero.id, m.main?.id, m.secondary])).toEqual([
      ["ana", "b", 2],
      ["bo", "c", 0],
    ]);
  });

  it("lists engaged heroes first, then idle ones, each by name ignoring case, then by id", () => {
    const result = party(
      world([
        hero("z", "zed"),
        hero("b2", "Bo", ["a"]),
        hero("al", "al", ["a"]),
        hero("b1", "Bo", ["b"]),
        hero("d", "Dmitri"),
      ]),
    );
    expect(ids(result.shown)).toEqual(["al", "b1", "b2", "d", "z"]);
    expect(result.idle).toBe(2);
  });

  it("skips slain and missing targets, so a hero with none left counts as idle", () => {
    const { shown, idle } = party(
      world([hero("ana", "Ana", ["gone", "a", "dead"]), hero("bo", "Bo", ["dead"])], [monster("a"), monster("dead", "2026-10-01")]),
    );
    expect(shown.map((m) => [m.hero.id, m.main?.id, m.secondary])).toEqual([
      ["ana", "a", 0],
      ["bo", undefined, 0],
    ]);
    expect(idle).toBe(1);
  });

  it("shows six in full and folds the rest, in order", () => {
    const heroes = Array.from({ length: 9 }, (_, i) => hero(`h${i}`, `Hero ${i}`, i % 3 ? ["a"] : []));
    const result = party(world(heroes));
    expect(result.shown).toHaveLength(PARTY_SHOWN);
    expect(ids(result.shown)).toEqual(["h1", "h2", "h4", "h5", "h7", "h8"]);
    expect(ids(result.folded)).toEqual(["h0", "h3", "h6"]);
    expect(result.idle).toBe(3);
  });

  it("leaves its input in place", () => {
    const heroes = [hero("b", "B"), hero("a", "A", ["a"])];
    party(world(heroes));
    expect(heroes.map((h) => h.id)).toEqual(["b", "a"]);
  });
});
