import { describe, expect, it } from "vitest";
import type { Monster } from "@/lib/types";
import { trophiesOf } from "./helpers";

const m = (id: string, extra: Partial<Monster> = {}): Monster => ({
  id,
  name: id,
  size: "M",
  pos: { x: 0, y: 0 },
  ...extra,
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
