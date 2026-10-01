import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hero, Monster, World } from "@/lib/types";
import { readWorld, updateWorld } from "./store";

const EXAMPLE = fileURLToPath(new URL("../../data.example", import.meta.url));

let dir: string;
const file = (name: string) => path.join(dir, name);
const read = (name: string) => readFile(file(name), "utf8");
const example = (name: string) => readFile(path.join(EXAMPLE, name), "utf8");

const read$ = () => readWorld(dir, EXAMPLE);
const update$ = (fn: (w: World) => World) => updateWorld(fn, dir, EXAMPLE);

const mapMonster = (id: string, f: (m: Monster) => Monster) => (w: World): World => ({
  ...w,
  monsters: w.monsters.map((m) => (m.id === id ? f(m) : m)),
});
const mapHero = (id: string, f: (h: Hero) => Hero) => (w: World): World => ({
  ...w,
  heroes: w.heroes.map((h) => (h.id === id ? f(h) : h)),
});

beforeEach(async () => {
  dir = path.join(await mkdtemp(path.join(tmpdir(), "initiative-store-")), "data");
});
afterEach(async () => {
  await rm(path.dirname(dir), { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("seeding", () => {
  it("creates data/ and both files when nothing is there", async () => {
    await read$();
    expect(await read("heroes.yaml")).toBe(await example("heroes.yaml"));
    expect(await read("monsters.yaml")).toBe(await example("monsters.yaml"));
  });

  it("copies only the missing file", async () => {
    await read$();
    await writeFile(file("heroes.yaml"), "# mine\n- id: zed\n  name: Zed\n  class: mage\n  targets: []\n  pos: { x: 1, y: 2 }\n");
    await rm(file("monsters.yaml"));
    const world = await read$();
    expect(world.heroes.map((h) => h.id)).toEqual(["zed"]);
    expect(await read("monsters.yaml")).toBe(await example("monsters.yaml"));
  });

  it("leaves existing files untouched", async () => {
    await read$();
    await writeFile(file("heroes.yaml"), "[]\n");
    await writeFile(file("monsters.yaml"), "# empty\n[]\n");
    expect(await read$()).toEqual({ monsters: [], heroes: [] });
    expect(await read("heroes.yaml")).toBe("[]\n");
    expect(await read("monsters.yaml")).toBe("# empty\n[]\n");
  });
});

describe("reading", () => {
  it("keeps slain as a string and normalizes missing targets", async () => {
    await read$();
    await writeFile(file("heroes.yaml"), "- id: zed\n  name: Zed\n  class: mage\n  pos: { x: 1, y: 2 }\n");
    const world = await read$();
    expect(world.monsters.find((m) => m.id === "onboarding-docs")?.slain).toBe("2026-09-28");
    expect(world.heroes[0]).toEqual({ id: "zed", name: "Zed", class: "mage", targets: [], pos: { x: 1, y: 2 } });
  });

  it("throws on malformed YAML instead of returning garbage", async () => {
    await read$();
    await writeFile(file("monsters.yaml"), "- id: a\n  pos: { x: 1\n");
    await expect(read$()).rejects.toThrow(/Cannot parse/);
  });

  it("logs, but does not throw, on items without an id", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await read$();
    await writeFile(file("heroes.yaml"), "- name: nobody\n");
    expect((await read$()).heroes).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });
});

describe("writing", () => {
  it("does not touch files when nothing changes", async () => {
    await read$();
    await update$((w) => w);
    await update$((w) => structuredClone(w));
    expect(await read("heroes.yaml")).toBe(await example("heroes.yaml"));
    expect(await read("monsters.yaml")).toBe(await example("monsters.yaml"));
  });

  it("keeps comments and flow style when a monster moves", async () => {
    await update$(mapMonster("flaky-ci", (m) => ({ ...m, pos: { x: 50, y: -10 } })));
    const text = await read("monsters.yaml");
    expect(text).toBe(
      (await example("monsters.yaml")).replace("pos: { x: -180, y: -120 }", "pos: { x: 50, y: -10 }"),
    );
    expect(await read("heroes.yaml")).toBe(await example("heroes.yaml"));
    expect((await read$()).monsters.find((m) => m.id === "flaky-ci")?.pos).toEqual({ x: 50, y: -10 });
  });

  it("keeps comments when a monster is slain", async () => {
    await update$(mapMonster("legacy-api-sunset", (m) => ({ ...m, slain: "2026-10-01" })));
    const text = await read("monsters.yaml");
    expect(text).toContain("# Nobody is on this one yet, so it should pulse red.");
    expect(text).toContain("- id: flaky-ci # fails about once a day");
    expect(text).toContain("# Monsters: anything to deal with.");
    expect(text).toContain("  pos: { x: -300, y: 420 }\n  slain: 2026-10-01\n");
    const world = await read$();
    expect(world.monsters.find((m) => m.id === "legacy-api-sunset")?.slain).toBe("2026-10-01");
  });

  it("removes a deleted item together with its comment", async () => {
    await update$((w) => ({ ...w, heroes: w.heroes.filter((h) => h.id !== "dmitri") }));
    const text = await read("heroes.yaml");
    expect(text).not.toContain("dmitri");
    expect(text).not.toContain("# Between assignments.");
    expect(text).toContain("# Heroes: engineers on the team, plus you.");
    expect(text).toBe(
      (await example("heroes.yaml")).replace(
        "# Between assignments.\n- id: dmitri\n  name: Dmitri\n  class: rogue\n  targets: []\n  pos: { x: -600, y: 40 }\n\n",
        "",
      ),
    );
  });

  it("keeps the header comment when the first item is deleted", async () => {
    await update$((w) => ({ ...w, heroes: w.heroes.filter((h) => h.id !== "ana") }));
    const text = await read("heroes.yaml");
    expect(text.startsWith("# Heroes: engineers on the team, plus you.")).toBe(true);
    expect(text).not.toContain("id: ana");
  });

  it("appends a new item in the file's style", async () => {
    await update$((w) => ({
      ...w,
      monsters: [
        ...w.monsters,
        { id: "new-thing", name: "New Thing", size: "S", pos: { x: 10, y: 20 }, notes: "line one\nline two" },
      ],
    }));
    const text = await read("monsters.yaml");
    expect(text).toBe(
      (await example("monsters.yaml")) +
        "\n- id: new-thing\n  name: New Thing\n  size: S\n  pos: { x: 10, y: 20 }\n  notes: |-\n    line one\n    line two\n",
    );
    const m = (await read$()).monsters.at(-1);
    expect(m?.notes).toBe("line one\nline two");
  });

  it("drops pos when a hero engages and adds it back when it goes idle", async () => {
    await update$(mapHero("dmitri", (h) => ({ id: h.id, name: h.name, class: h.class, targets: ["legacy-api-sunset"] })));
    let text = await read("heroes.yaml");
    expect(text).toContain("# Between assignments.\n- id: dmitri\n  name: Dmitri\n  class: rogue\n  targets: [legacy-api-sunset]\n\n- id: me");
    expect(text).toContain("targets: [search-rewrite, flaky-ci]");

    await update$(mapHero("dmitri", (h) => ({ ...h, targets: [], pos: { x: 5, y: 6 } })));
    text = await read("heroes.yaml");
    expect(text).toContain("  targets: []\n  pos: { x: 5, y: 6 }\n");
    expect((await read$()).heroes.find((h) => h.id === "dmitri")).toEqual({
      id: "dmitri", name: "Dmitri", class: "rogue", targets: [], pos: { x: 5, y: 6 },
    });
  });

  it("writes multi-line notes as a block scalar and keeps a single line plain", async () => {
    await update$(mapMonster("hire-backend-engineer", (m) => ({ ...m, notes: "a\nb\n" })));
    expect(await read("monsters.yaml")).toContain("  notes: |\n    a\n    b\n");
    await update$(mapMonster("search-rewrite", (m) => ({ ...m, notes: "Just one line now." })));
    expect(await read("monsters.yaml")).toContain("  notes: Just one line now.\n");
    await update$(mapMonster("search-rewrite", (m) => ({ ...m, notes: undefined })));
    expect(await read("monsters.yaml")).not.toContain("Just one line now.");
  });

  it("applies concurrent updates without losing either", async () => {
    await read$();
    await Promise.all([
      update$(mapMonster("flaky-ci", (m) => ({ ...m, pos: { x: 1, y: 1 } }))),
      update$(mapMonster("payments-incident", (m) => ({ ...m, pos: { x: 2, y: 2 } }))),
      update$(mapHero("ana", (h) => ({ ...h, name: "Anna" }))),
    ]);
    const world = await read$();
    expect(world.monsters.find((m) => m.id === "flaky-ci")?.pos).toEqual({ x: 1, y: 1 });
    expect(world.monsters.find((m) => m.id === "payments-incident")?.pos).toEqual({ x: 2, y: 2 });
    expect(world.heroes.find((h) => h.id === "ana")?.name).toBe("Anna");
  });

  it("keeps going after a failed update and leaves no temp files", async () => {
    await read$();
    await expect(update$(() => { throw new Error("boom"); })).rejects.toThrow("boom");
    await update$(mapHero("ana", (h) => ({ ...h, name: "Anna" })));
    expect((await read$()).heroes[0].name).toBe("Anna");
    expect((await readdir(dir)).sort()).toEqual(["heroes.yaml", "monsters.yaml"]);
  });
});
