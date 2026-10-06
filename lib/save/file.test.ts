import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { World } from "@/lib/types";
import { parseSave, saveFileName, stringifySave, tableCounts } from "./file";

const AT = new Date("2026-10-05T09:12:44.000Z");

const world: World = {
  monsters: [
    {
      id: "search-rewrite",
      name: "Search Rewrite",
      size: "XL",
      pos: { x: -420, y: 180 },
      notes: "Next step: spike\nOwner: product",
      externalKey: "SRCH-12",
    },
    { id: "flaky-ci", name: "Flaky CI", size: "M", mini: "blue-imp", pos: { x: -180, y: -120 }, notes: "Once a day" },
    { id: "docs", name: "Docs", size: "S", pos: { x: 0, y: 0 }, slain: "2026-09-28", slainBy: ["dmitri"] },
  ],
  heroes: [
    {
      id: "ana",
      name: "Ana",
      class: "archer",
      guild: "Cloud",
      mini: "hooded-rogue",
      targets: ["search-rewrite", "flaky-ci"],
    },
    { id: "dmitri", name: "Dmitri", class: "rogue", targets: [], pos: { x: -600, y: 40 } },
  ],
};

describe("saveFileName", () => {
  it("names the file after the local date", () => {
    expect(saveFileName(new Date(2026, 0, 7, 23, 59))).toBe("initiative-2026-01-07.yaml");
  });
});

describe("stringifySave", () => {
  const text = stringifySave(world, AT);

  it("round-trips the table", () => {
    expect(parseSave(text)).toEqual({ world, savedAt: AT.toISOString(), problems: [] });
  });

  it("writes the version, the time and a header comment", () => {
    expect(text).toMatch(/^# Initiative save\./);
    expect(text).toContain("\ninitiative: 1\n");
    expect(text).toContain("savedAt: 2026-10-05T09:12:44.000Z\n");
  });

  it("writes pos and id lists on one line, and multi-line notes as a block", () => {
    expect(text).toContain("    pos: { x: -420, y: 180 }\n");
    expect(text).toContain("    targets: [search-rewrite, flaky-ci]\n");
    expect(text).toContain("    slainBy: [dmitri]\n");
    expect(text).toContain("    notes: |-\n      Next step: spike\n      Owner: product\n");
    expect(text).toContain("    notes: Once a day\n");
  });

  it("keeps slain a plain date and writes no pos for an engaged hero", () => {
    expect(text).toContain("    slain: 2026-09-28\n");
    expect(text.split("- id: ana")[1].split("- id:")[0]).not.toContain("pos:");
  });

  it("writes fields in a fixed order", () => {
    const ana = text.split("- id: ana")[1].split("\n\n")[0];
    expect(ana.indexOf("name:")).toBeLessThan(ana.indexOf("class:"));
    expect(ana.indexOf("class:")).toBeLessThan(ana.indexOf("guild:"));
    expect(ana.indexOf("guild:")).toBeLessThan(ana.indexOf("mini:"));
    expect(ana.indexOf("mini:")).toBeLessThan(ana.indexOf("targets:"));
    const ci = text.split("- id: flaky-ci")[1].split("\n\n")[0];
    expect(ci.indexOf("size:")).toBeLessThan(ci.indexOf("mini:"));
    expect(ci.indexOf("mini:")).toBeLessThan(ci.indexOf("pos:"));
  });

  it("writes an empty table", () => {
    expect(parseSave(stringifySave({ monsters: [], heroes: [] }, AT)).world).toEqual({ monsters: [], heroes: [] });
  });
});

describe("parseSave", () => {
  it("refuses text that isn't YAML, saying which line", () => {
    expect(() => parseSave("initiative: 1\nmonsters: [a\nheroes: x: y")).toThrow(/^Line \d+: /);
  });

  it("refuses YAML that isn't a save", () => {
    expect(() => parseSave("- id: ana\n  name: Ana\n")).toThrow("This isn't a game saved by Initiative");
    expect(() => parseSave("monsters: []\n")).toThrow("This isn't a game saved by Initiative");
  });

  it("refuses another format version", () => {
    expect(() => parseSave("initiative: 2\n")).toThrow(/format 2/);
  });

  it("loads a file with problems and lists them", () => {
    const { world: w, problems } = parseSave(
      [
        "initiative: 1",
        "monsters:",
        "  - name: No id",
        "  - id: m1",
        "    name: M1",
        "    size: M",
        "heroes:",
        "  - id: ana",
        "    name: Ana",
        "    class: archer",
        "    targets: [gone]",
      ].join("\n"),
    );
    expect(w.monsters.map((m) => m.id)).toEqual(["m1"]);
    expect(w.heroes[0].targets).toEqual(["gone"]);
    expect(problems).toEqual([
      'Item 1 of "monsters" has no id, so it was left out',
      'Monster "m1" has no pos, so it stands at the centre',
      'Hero "ana" targets missing monster "gone"',
    ]);
  });

  it("treats missing lists and targets as empty", () => {
    const { world: w, problems } = parseSave("initiative: 1\nheroes:\n  - { id: a, name: A, class: c, pos: { x: 1, y: 2 } }\n");
    expect(w).toEqual({ monsters: [], heroes: [{ id: "a", name: "A", class: "c", targets: [], pos: { x: 1, y: 2 } }] });
    expect(problems).toEqual([]);
  });
});

describe("tableCounts", () => {
  it("counts living monsters, heroes and trophies", () => {
    expect(tableCounts(world)).toEqual({ monsters: 2, heroes: 2, trophies: 1 });
  });
});

describe("data.example/initiative.yaml", () => {
  const { world: example, problems } = parseSave(
    readFileSync(new URL("../../data.example/initiative.yaml", import.meta.url), "utf8"),
  );

  it("loads without problems", () => {
    expect(problems).toEqual([]);
  });

  it("keeps slain as a plain date string", () => {
    expect(example.monsters.find((m) => m.slain)?.slain).toBe("2026-09-28");
  });

  it("covers every size, an idle hero and an unfought monster", () => {
    expect(new Set(example.monsters.map((m) => m.size))).toEqual(new Set(["S", "M", "L", "XL"]));
    expect(example.heroes.some((h) => h.targets.length === 0)).toBe(true);
    const targeted = new Set(example.heroes.flatMap((h) => h.targets));
    expect(example.monsters.some((m) => !m.slain && !targeted.has(m.id))).toBe(true);
  });
});
