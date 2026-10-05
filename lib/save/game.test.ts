import { describe, expect, it } from "vitest";
import { makeWorld } from "@/lib/domain/test-fixtures";
import * as domain from "@/lib/domain";
import {
  backupDue,
  createGameStore,
  daysAgo,
  decodeGame,
  encodeGame,
  matchesFile,
  newGame,
  STORAGE_KEY,
  UNREADABLE_KEY,
  type Game,
} from "./game";

/** An in-memory `Storage`; `fail` makes every call throw, like a blocked or full one. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const s = {
    fail: false,
    data,
    getItem(k: string) {
      if (s.fail) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      if (s.fail) throw new Error("quota");
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
  return s;
}

const NOW = new Date("2026-10-05T10:00:00.000Z");
const example = makeWorld();
const stored = (s: ReturnType<typeof memoryStorage>) => decodeGame(s.data.get(STORAGE_KEY) ?? null);

describe("createGameStore", () => {
  it("starts on the example table when nothing is stored, without writing it", () => {
    const s = memoryStorage();
    const store = createGameStore(s, example, () => NOW);
    expect(store.getState()).toEqual({ game: newGame(example, true), generation: 0, storage: "ok" });
    expect(s.data.size).toBe(0);
  });

  it("reads the stored game", () => {
    const game: Game = { world: { monsters: [], heroes: [] }, example: false, fileSavedAt: null, unsavedSince: null };
    const store = createGameStore(memoryStorage({ [STORAGE_KEY]: encodeGame(game) }), example);
    expect(store.getState().game).toEqual(game);
  });

  it("moves a stored game it can't read aside instead of losing it", () => {
    const s = memoryStorage({ [STORAGE_KEY]: "{not json" });
    const store = createGameStore(s, example);
    expect(store.getState().game.example).toBe(true);
    expect(s.data.get(UNREADABLE_KEY)).toBe("{not json");
  });

  it("stores every change and marks it unsaved from the first change on", () => {
    const s = memoryStorage();
    let now = NOW;
    const store = createGameStore(s, example, () => now);
    store.update((w) => domain.moveMonster(w, "m1", { x: 5, y: 5 }));
    now = new Date("2026-10-06T10:00:00.000Z");
    store.update((w) => domain.moveMonster(w, "m1", { x: 6, y: 6 }));
    expect(stored(s)).toMatchObject({ example: false, unsavedSince: NOW.toISOString() });
    expect(stored(s)?.world.monsters.find((m) => m.id === "m1")?.pos).toEqual({ x: 6, y: 6 });
  });

  it("ignores a change that changes nothing", () => {
    const s = memoryStorage();
    const store = createGameStore(s, example);
    store.update((w) => w);
    expect(s.data.size).toBe(0);
    expect(store.getState().game.example).toBe(true);
  });

  it("leaves the game as it was when a change throws", () => {
    const store = createGameStore(memoryStorage(), example);
    const before = store.getState();
    expect(() => store.update((w) => domain.deleteHero(w, "nobody"))).toThrow();
    expect(store.getState()).toBe(before);
  });

  it("carries on in memory when storage refuses a write, and recovers", () => {
    const s = memoryStorage();
    const store = createGameStore(s, example);
    s.fail = true;
    store.update((w) => domain.moveMonster(w, "m1", { x: 5, y: 5 }));
    expect(store.getState().storage).toBe("failed");
    expect(store.getState().game.world.monsters.find((m) => m.id === "m1")?.pos).toEqual({ x: 5, y: 5 });
    s.fail = false;
    store.update((w) => domain.moveMonster(w, "m1", { x: 6, y: 6 }));
    expect(store.getState().storage).toBe("ok");
  });

  it("reports failed storage when it can't even read", () => {
    const s = memoryStorage();
    s.fail = true;
    expect(createGameStore(s, example).getState().storage).toBe("failed");
    expect(createGameStore(null, example).getState().storage).toBe("failed");
  });

  it("starts a new generation when the game is replaced, but not when it is amended", () => {
    const s = memoryStorage();
    const store = createGameStore(s, example);
    const empty = newGame({ monsters: [], heroes: [] }, false);
    store.replace(empty);
    expect(store.getState()).toMatchObject({ game: empty, generation: 1 });
    store.amend((g) => matchesFile(g, NOW));
    expect(store.getState().generation).toBe(1);
    expect(stored(s)?.fileSavedAt).toBe(NOW.toISOString());
  });

  it("takes in a game stored by another tab, and ignores junk", () => {
    const store = createGameStore(memoryStorage(), example);
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.getState().generation));
    const other = newGame({ monsters: [], heroes: [] }, false);
    store.external(encodeGame(other));
    store.external("junk");
    store.external(null);
    expect(store.getState().game).toEqual(other);
    expect(seen).toEqual([0]);
  });
});

describe("backups", () => {
  const game = (unsavedSince: string | null): Game => ({ ...newGame(example, false), unsavedSince });

  it("are due after seven days of unsaved changes", () => {
    expect(backupDue(game(null), NOW)).toBe(false);
    expect(backupDue(game("2026-09-29T10:00:01.000Z"), NOW)).toBe(false);
    expect(backupDue(game("2026-09-28T10:00:00.000Z"), NOW)).toBe(true);
  });

  it("a file save clears the unsaved changes and the example", () => {
    expect(matchesFile({ ...game("2026-09-01T00:00:00.000Z"), example: true }, NOW)).toMatchObject({
      example: false,
      fileSavedAt: NOW.toISOString(),
      unsavedSince: null,
    });
  });

  it("days are counted in local calendar days", () => {
    const now = new Date(2026, 9, 5, 0, 30);
    expect(daysAgo(new Date(2026, 9, 4, 23, 30).toISOString(), now)).toBe(1);
    expect(daysAgo(new Date(2026, 9, 5, 0, 10).toISOString(), now)).toBe(0);
    expect(daysAgo(new Date(2026, 8, 26, 12).toISOString(), now)).toBe(9);
  });
});
