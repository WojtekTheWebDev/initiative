import { describe, expect, it } from "vitest";
import type { Hero, Monster, World } from "@/lib/types";
import { dayLabel, monthLabel, trophiesOf, trophyHall } from "./trophies";

const m = (id: string, extra: Partial<Monster> = {}): Monster => ({
  id,
  name: id,
  size: "M",
  pos: { x: 0, y: 0 },
  ...extra,
});

const h = (id: string, name: string): Hero => ({ id, name, class: "", targets: [], pos: { x: 0, y: 0 } });

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

describe("trophyHall", () => {
  const world: World = {
    monsters: [
      m("sep", { slain: "2026-09-30" }),
      m("alive"),
      m("oct-late", { slain: "2026-10-20", slainBy: ["bartek", "gone", "ana"] }),
      m("oct-early", { slain: "2026-10-01", notes: "\n  First line  \nsecond line\n" }),
      m("old", { slain: "2025-10-15" }),
    ],
    heroes: [h("ana", "Ana"), h("bartek", "Bartek")],
  };

  it("groups by month of slain, newest month and newest trophy first", () => {
    const groups = trophyHall(world);
    expect(groups.map((g) => g.month)).toEqual(["2026-10", "2026-09", "2025-10"]);
    expect(groups[0].label).toBe("October 2026");
    expect(groups[0].plaques.map((p) => p.monster.id)).toEqual(["oct-late", "oct-early"]);
  });

  it("names who fought it in slainBy order, skipping deleted heroes", () => {
    const [october] = trophyHall(world);
    expect(october.plaques[0].by).toEqual(["Bartek", "Ana"]);
    expect(october.plaques[1].by).toEqual([]);
  });

  it("shows the first non-empty line of the notes", () => {
    const [october] = trophyHall(world);
    expect(october.plaques[1].note).toBe("First line");
    expect(october.plaques[0].note).toBeUndefined();
  });

  it("is empty with no trophies", () => {
    expect(trophyHall({ monsters: [m("alive")], heroes: [] })).toEqual([]);
  });
});

describe("monthLabel and dayLabel", () => {
  it("name the month and year, and the day", () => {
    expect(monthLabel("2026-01")).toBe("January 2026");
    expect(monthLabel("2026-12")).toBe("December 2026");
    expect(dayLabel("2026-10-05")).toBe("5 October 2026");
  });

  it("show a date they can't read as it is", () => {
    expect(monthLabel("someday")).toBe("someday");
    expect(dayLabel("2026-13-01")).toBe("2026-13-01");
  });
});
