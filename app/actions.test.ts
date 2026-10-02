import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

import { refresh } from "next/cache";
import { readWorld } from "@/lib/store/store";
import { unwrap } from "@/lib/action-result";
import * as actions from "./actions";

const repo = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "initiative-actions-"));
  await cp(path.join(repo, "data.example"), path.join(dir, "data.example"), { recursive: true });
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  vi.mocked(refresh).mockClear();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

const world = () => readWorld(path.join(dir, "data"), path.join(dir, "data.example"));

describe("server actions (smoke)", () => {
  it("moves a monster, keeps comments, and refreshes", async () => {
    await actions.moveMonster("flaky-ci", { x: 50, y: 60 });
    const w = await world();
    expect(w.monsters.find((m) => m.id === "flaky-ci")?.pos).toEqual({ x: 50, y: 60 });
    const text = await readFile(path.join(dir, "data", "monsters.yaml"), "utf8");
    expect(text).toContain("# fails about once a day");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("dropHero maps to addGhost, assign and setIdle", async () => {
    await actions.dropHero("bartek", { monsterId: "flaky-ci", shift: true });
    expect((await world()).heroes.find((h) => h.id === "bartek")?.targets).toEqual(["search-rewrite", "flaky-ci"]);

    // plain drop on the current main target keeps secondary targets
    await actions.dropHero("bartek", { monsterId: "search-rewrite", shift: false });
    expect((await world()).heroes.find((h) => h.id === "bartek")?.targets).toEqual(["search-rewrite", "flaky-ci"]);

    await actions.dropHero("bartek", { monsterId: "legacy-api-sunset", shift: false });
    expect((await world()).heroes.find((h) => h.id === "bartek")?.targets).toEqual(["legacy-api-sunset"]);

    await actions.dropHero("bartek", { pos: { x: 1, y: 2 } });
    const b = (await world()).heroes.find((h) => h.id === "bartek");
    expect(b?.targets).toEqual([]);
    expect(b?.pos).toEqual({ x: 1, y: 2 });
  });

  it("creates, slays and deletes monsters", async () => {
    const id = await unwrap(actions.createMonster({ name: "  Test Goblin ", size: "S", pos: { x: 1, y: 1 } }));
    expect(id).toBe("test-goblin");
    expect((await world()).monsters.find((m) => m.id === id)?.name).toBe("Test Goblin");

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 23, 30)); // local 2026-10-01 late evening
    await actions.slayMonster(id);
    vi.useRealTimers();
    expect((await world()).monsters.find((m) => m.id === id)?.slain).toBe("2026-10-01");

    await actions.deleteMonster(id);
    expect((await world()).monsters.find((m) => m.id === id)).toBeUndefined();
  });

  it("creates and updates heroes", async () => {
    const id = await unwrap(actions.createHero({ name: "Eve", class: "cleric", pos: { x: 3, y: 4 } }));
    await actions.updateHero(id, { name: "Eva" });
    const h = (await world()).heroes.find((x) => x.id === id);
    expect(h).toMatchObject({ id: "eve", name: "Eva", class: "cleric", pos: { x: 3, y: 4 } });
    await actions.deleteHero(id);
    expect((await world()).heroes.find((x) => x.id === id)).toBeUndefined();
  });

  it("writes only the mini when a hero picks one, keeping comments", async () => {
    await world(); // seeds data/ from data.example/
    const before = await readFile(path.join(dir, "data", "heroes.yaml"), "utf8");
    await actions.updateHero("me", { mini: "knight" });
    const after = await readFile(path.join(dir, "data", "heroes.yaml"), "utf8");
    expect(after).toContain("# Between assignments.");
    expect(after).toBe(before.replace("  class: commander\n", "  class: commander\n  mini: knight\n"));
    expect((await world()).heroes.find((h) => h.id === "me")?.mini).toBe("knight");
    await actions.updateHero("me", { mini: "" });
    expect(await readFile(path.join(dir, "data", "heroes.yaml"), "utf8")).toBe(before);
    const result = await actions.updateHero("dmitri", { mini: 3 as never });
    expect(result.ok ? "" : result.error).toMatch(/Mini/);
  });

  it("returns ok results", async () => {
    expect(await actions.moveMonster("flaky-ci", { x: 5, y: 5 })).toEqual({ ok: true, value: undefined });
    expect(await actions.createHero({ name: "Zed", class: "mage", pos: { x: 0, y: 0 } })).toEqual({
      ok: true,
      value: "zed",
    });
  });

  // Errors are returned, not thrown: Next.js hides thrown messages in production.
  it("returns bad input as readable errors and does not refresh", async () => {
    const error = (r: { ok: boolean; error?: string }) => (r.ok ? "" : r.error);
    expect(error(await actions.createMonster({ name: " ", size: "S", pos: { x: 0, y: 0 } }))).toMatch(/name/);
    expect(
      error(await actions.createMonster({ name: "X", size: "XXL" as never, pos: { x: 0, y: 0 } })),
    ).toMatch(/Size/);
    expect(error(await actions.moveMonster("flaky-ci", { x: NaN, y: 0 }))).toMatch(/finite/);
    expect(error(await actions.moveMonster(42 as never, { x: 0, y: 0 }))).toMatch(/id/);
    expect(error(await actions.slayMonster("nope"))).toMatch(/nope/);
    expect(error(await actions.dropHero("ana", null as never))).toMatch(/Drop/);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("unwrap throws the returned message on the client", async () => {
    await expect(unwrap(actions.slayMonster("nope"))).rejects.toThrow(/nope/);
    await expect(unwrap(actions.deleteHero("ana"))).resolves.toBeUndefined();
  });
});
