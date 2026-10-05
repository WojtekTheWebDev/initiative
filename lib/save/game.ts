import type { World } from "@/lib/types";

/**
 * The game kept in the browser: the table plus what the HUD says about
 * backups. Pure apart from the `Storage` handed to `createGameStore`, so it
 * runs in Vitest with an in-memory storage.
 */
export type Game = {
  world: World;
  /** The example table, untouched since it was dealt: the first-visit banner shows. */
  example: boolean;
  /** When the table was last written to, or read from, a save file (ISO time). */
  fileSavedAt: string | null;
  /** The first change since then (ISO time); null when the table matches its last file. */
  unsavedSince: string | null;
};

/** The local-storage key holding the game as JSON. */
export const STORAGE_KEY = "initiative.game";
/** Where a stored game that can't be read is moved, so starting over never overwrites it. */
export const UNREADABLE_KEY = "initiative.game.unreadable";

/** Days of unsaved changes after which the wordmark shows the backup dot. */
export const BACKUP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const EMPTY_WORLD: World = { monsters: [], heroes: [] };

/** A fresh game on `world`: the example table shows the first-visit banner. */
export function newGame(world: World, example: boolean): Game {
  return { world, example, fileSavedAt: null, unsavedSince: null };
}

export function encodeGame(game: Game): string {
  return JSON.stringify(game);
}

const isList = (v: unknown) => Array.isArray(v) && v.every((x) => !!x && typeof x === "object");
const isTime = (v: unknown) => v === null || typeof v === "string";

/** The stored game, or null when `raw` is missing or isn't a game. */
export function decodeGame(raw: string | null): Game | null {
  if (raw === null) return null;
  try {
    const g = JSON.parse(raw) as Partial<Game> | null;
    if (!g || typeof g !== "object" || !g.world || !isList(g.world.monsters) || !isList(g.world.heroes)) return null;
    if (typeof g.example !== "boolean" || !isTime(g.fileSavedAt) || !isTime(g.unsavedSince)) return null;
    return { world: g.world, example: g.example, fileSavedAt: g.fileSavedAt!, unsavedSince: g.unsavedSince! };
  } catch {
    return null;
  }
}

/** The game after a change to its table: no longer the untouched example, and unsaved since now (or earlier). */
export function changed(game: Game, world: World, now: Date): Game {
  return { world, example: false, fileSavedAt: game.fileSavedAt, unsavedSince: game.unsavedSince ?? now.toISOString() };
}

/** The game once its table matches a save file written or read at `at`. */
export function matchesFile(game: Game, at: Date | string): Game {
  const iso = typeof at === "string" ? at : at.toISOString();
  return { ...game, example: false, fileSavedAt: iso, unsavedSince: null };
}

/** True once changes have gone unsaved to a file for `BACKUP_DAYS`. */
export function backupDue(game: Game, now: Date): boolean {
  return game.unsavedSince !== null && now.getTime() - Date.parse(game.unsavedSince) >= BACKUP_DAYS * DAY_MS;
}

/** Whole local days from `iso` to `now`: 0 is today, 1 is yesterday. */
export function daysAgo(iso: string, now: Date): number {
  const then = new Date(iso);
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(now) - day(then)) / DAY_MS);
}

/** Whether the browser keeps the game: "failed" once it refused to store or read it. */
export type StorageStatus = "ok" | "failed";

export type GameState = {
  game: Game;
  /** Bumped when the whole table is replaced (Load game, New game), so the board starts afresh. */
  generation: number;
  storage: StorageStatus;
};

export type GameStore = {
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  /**
   * Applies a change to the table and stores it. Returns the new world.
   * Throws what `fn` throws, leaving the game as it was.
   */
  update(fn: (world: World) => World): World;
  /** Replaces the whole game (Load game, New game). */
  replace(game: Game): void;
  /** Changes what is known about the game without touching the table (a file save, dismissing the banner). */
  amend(fn: (game: Game) => Game): void;
  /** Takes in a game another tab stored (from the `storage` event). */
  external(raw: string | null): void;
};

/**
 * The game, kept in `storage` (local storage in the browser) under
 * `STORAGE_KEY`. Without a stored game it starts on the example table. When
 * the storage refuses a read or a write, the game carries on in memory and
 * `storage` says "failed", so the HUD can ask for a save to a file.
 */
export function createGameStore(storage: Storage | null, example: World, now: () => Date = () => new Date()): GameStore {
  let status: StorageStatus = storage ? "ok" : "failed";
  let game = newGame(example, true);
  try {
    const raw = storage?.getItem(STORAGE_KEY) ?? null;
    const stored = decodeGame(raw);
    if (stored) game = stored;
    else if (raw !== null) storage?.setItem(UNREADABLE_KEY, raw);
  } catch {
    status = "failed";
  }

  let state: GameState = { game, generation: 0, storage: status };
  const listeners = new Set<() => void>();

  const set = (next: Partial<GameState>) => {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const persist = (g: Game): StorageStatus => {
    if (!storage) return "failed";
    try {
      storage.setItem(STORAGE_KEY, encodeGame(g));
      return "ok";
    } catch {
      return "failed";
    }
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(fn) {
      const world = fn(state.game.world);
      if (world === state.game.world) return world;
      const g = changed(state.game, world, now());
      set({ game: g, storage: persist(g) });
      return world;
    },
    replace(g) {
      set({ game: g, generation: state.generation + 1, storage: persist(g) });
    },
    amend(fn) {
      const g = fn(state.game);
      set({ game: g, storage: persist(g) });
    },
    external(raw) {
      const g = decodeGame(raw);
      if (g) set({ game: g });
    },
  };
}
