import { TERRAINS, type Terrain } from "@/lib/map/terrain";

/**
 * How this browser shows the table. Settings belong to the browser, not to
 * the table: they are kept in local storage next to the game and never go
 * into a save file. Pure apart from the `Storage` handed to
 * `createSettingsStore`, so it runs in Vitest with an in-memory storage.
 */
export type Settings = {
  /** What the table is made of: every biome in regions, or one biome everywhere. */
  terrain: Terrain;
};

/** The local-storage key holding the settings as JSON. */
export const SETTINGS_KEY = "initiative.settings";

export const DEFAULT_SETTINGS: Settings = { terrain: "mixed" };

export function encodeSettings(settings: Settings): string {
  return JSON.stringify(settings);
}

/** The stored settings; anything missing or unreadable falls back to its default. */
export function decodeSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    const s = JSON.parse(raw) as Partial<Settings> | null;
    const terrain = TERRAINS.find((t) => t === s?.terrain) ?? DEFAULT_SETTINGS.terrain;
    return { terrain };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export type SettingsStore = {
  getState(): Settings;
  subscribe(listener: () => void): () => void;
  /** Changes the settings and stores them. A browser that won't store them keeps them until the tab closes. */
  update(fn: (settings: Settings) => Settings): void;
  /** Takes in settings another tab stored (from the `storage` event). */
  external(raw: string | null): void;
};

/** The settings, kept in `storage` (local storage in the browser) under `SETTINGS_KEY`. */
export function createSettingsStore(storage: Storage | null): SettingsStore {
  let state = DEFAULT_SETTINGS;
  try {
    state = decodeSettings(storage?.getItem(SETTINGS_KEY) ?? null);
  } catch {
    // Unreadable storage: the defaults stand.
  }
  const listeners = new Set<() => void>();
  const set = (next: Settings) => {
    state = next;
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(fn) {
      const next = fn(state);
      if (next === state) return;
      try {
        storage?.setItem(SETTINGS_KEY, encodeSettings(next));
      } catch {
        // The game's own storage alarm already tells the player this browser won't keep things.
      }
      set(next);
    },
    external(raw) {
      set(decodeSettings(raw));
    },
  };
}
