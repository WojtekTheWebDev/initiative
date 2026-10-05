import { describe, expect, it } from "vitest";
import { validateWorld } from "./validate";
import { makeWorld } from "./test-fixtures";
import type { World } from "@/lib/types";

describe("validateWorld", () => {
  it("accepts a valid world", () => {
    expect(validateWorld(makeWorld())).toEqual([]);
    expect(validateWorld({ monsters: [], heroes: [] })).toEqual([]);
  });

  it("reports every kind of problem without throwing", () => {
    const w = makeWorld();
    w.monsters.push({ id: "m1", name: "Dup", size: "XXL" as never, pos: undefined as never });
    w.heroes.push(
      { id: "ana", name: "Dup", class: "c", targets: ["m3", "m3"] },
      { id: "eng", name: "E", class: "c", targets: ["gone", "m4"], pos: { x: 1, y: 1 } },
      { id: "idl", name: "I", class: "c", targets: [] },
      { id: "nan", name: "N", class: "c", targets: [], pos: { x: NaN, y: 0 } },
      { id: "bad", name: "B", class: "c", targets: "m1" as never },
    );
    expect(validateWorld(w)).toEqual([
      'Duplicate monster id "m1"',
      'Duplicate hero id "ana"',
      'Monster "m1" has unknown size "XXL"',
      'Monster "m1" has no valid pos',
      'Hero "ana" lists target "m3" more than once',
      'Hero "eng" targets missing monster "gone"',
      'Hero "eng" targets slain monster "m4"',
      'Hero "eng" is engaged but has a pos',
      'Hero "idl" is idle but has no valid pos',
      'Hero "nan" is idle but has no valid pos',
      'Hero "bad" has targets that are not a list',
    ]);
  });

  it("accepts any text as a mini, including ids that are not in the roster", () => {
    const w = makeWorld();
    w.heroes[0].mini = "knight";
    w.heroes[1].mini = "not-a-real-mini";
    expect(validateWorld(w)).toEqual([]);
    w.heroes[2].mini = 7 as never;
    expect(validateWorld(w)).toEqual(['Hero "cid" has a mini that is not text']);
  });

  it("accepts slainBy only as a list of hero ids", () => {
    const w = makeWorld();
    w.monsters[3].slainBy = ["ana", "gone"];
    expect(validateWorld(w)).toEqual([]);
    w.monsters[3].slainBy = "ana" as never;
    w.monsters[2].slainBy = [1] as never;
    expect(validateWorld(w)).toEqual([
      'Monster "m3" has a slainBy that is not a list of hero ids',
      'Monster "m4" has a slainBy that is not a list of hero ids',
    ]);
  });

  it("does not mutate the world", () => {
    const w: World = makeWorld();
    validateWorld(w);
    expect(w).toEqual(makeWorld());
  });
});
