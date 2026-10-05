import { describe, expect, it } from "vitest";
import type { Monster, Size } from "@/lib/types";
import { MUSTER_SHOWN, muster } from "./muster";

const monster = (id: string, name: string, size: Size): Monster => ({ id, name, size, pos: { x: 0, y: 0 } });
const ids = (monsters: Monster[]) => monsters.map((m) => m.id);

describe("muster", () => {
  it("is empty with no unfought monsters", () => {
    expect(muster([])).toEqual({ shown: [], folded: [] });
  });

  it("orders largest first, then by name, then by id", () => {
    const result = muster([
      monster("s", "Alpha", "S"),
      monster("m2", "Beta", "M"),
      monster("xl", "Zed", "XL"),
      monster("m1", "Alpha", "M"),
      monster("l", "Kappa", "L"),
      monster("m0", "Alpha", "M"),
    ]);
    expect(ids(result.shown)).toEqual(["xl", "l", "m0", "m1", "m2", "s"]);
    expect(result.folded).toEqual([]);
  });

  it("ignores case when ordering names", () => {
    expect(ids(muster([monster("b", "bravo", "M"), monster("a", "Alpha", "M")]).shown)).toEqual(["a", "b"]);
  });

  it("shows six in full and folds the rest, in order", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => {
      const n = String(i).padStart(2, "0");
      return monster(`m${n}`, `Monster ${n}`, i % 2 ? "S" : "XL");
    });
    const result = muster(twelve);
    expect(result.shown).toHaveLength(MUSTER_SHOWN);
    expect(ids(result.shown)).toEqual(["m00", "m02", "m04", "m06", "m08", "m10"]);
    expect(ids(result.folded)).toEqual(["m01", "m03", "m05", "m07", "m09", "m11"]);
  });

  it("folds nothing at exactly six", () => {
    const six = Array.from({ length: 6 }, (_, i) => monster(`m${i}`, `M${i}`, "M"));
    expect(muster(six).folded).toEqual([]);
  });

  it("leaves its input in place", () => {
    const input = [monster("s", "A", "S"), monster("xl", "B", "XL")];
    muster(input);
    expect(ids(input)).toEqual(["s", "xl"]);
  });
});
