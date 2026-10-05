import { describe, expect, it } from "vitest";
import { TERRAINS } from "@/lib/map/terrain";
import {
  createSettingsStore,
  decodeSettings,
  DEFAULT_SETTINGS,
  encodeSettings,
  SETTINGS_KEY,
  type Settings,
} from "./settings";

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

describe("settings", () => {
  it("starts on the mixed terrain", () => {
    expect(DEFAULT_SETTINGS.terrain).toBe("mixed");
    expect(decodeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips every terrain through JSON", () => {
    for (const terrain of TERRAINS) {
      const s: Settings = { terrain };
      expect(decodeSettings(encodeSettings(s))).toEqual(s);
    }
  });

  it("falls back to the mixed terrain for an unknown terrain or broken JSON", () => {
    expect(decodeSettings(JSON.stringify({ terrain: "lava" }))).toEqual(DEFAULT_SETTINGS);
    expect(decodeSettings(JSON.stringify({}))).toEqual(DEFAULT_SETTINGS);
    expect(decodeSettings("{nope")).toEqual(DEFAULT_SETTINGS);
    expect(decodeSettings("null")).toEqual(DEFAULT_SETTINGS);
  });
});

describe("createSettingsStore", () => {
  it("reads the stored settings and stores every change", () => {
    const storage = memoryStorage({ [SETTINGS_KEY]: encodeSettings({ terrain: "marsh" }) });
    const store = createSettingsStore(storage);
    expect(store.getState().terrain).toBe("marsh");
    let calls = 0;
    store.subscribe(() => calls++);
    store.update((s) => ({ ...s, terrain: "highlands" }));
    expect(store.getState().terrain).toBe("highlands");
    expect(decodeSettings(storage.data.get(SETTINGS_KEY)!).terrain).toBe("highlands");
    expect(calls).toBe(1);
  });

  it("ignores a change that changes nothing", () => {
    const storage = memoryStorage();
    const store = createSettingsStore(storage);
    let calls = 0;
    store.subscribe(() => calls++);
    store.update((s) => s);
    expect(calls).toBe(0);
    expect(storage.data.has(SETTINGS_KEY)).toBe(false);
  });

  it("carries on in memory when the browser won't store", () => {
    const storage = memoryStorage();
    storage.fail = true;
    const store = createSettingsStore(storage);
    expect(store.getState()).toEqual(DEFAULT_SETTINGS);
    store.update((s) => ({ ...s, terrain: "woods" }));
    expect(store.getState().terrain).toBe("woods");
    expect(createSettingsStore(null).getState()).toEqual(DEFAULT_SETTINGS);
  });

  it("takes in settings from another tab", () => {
    const store = createSettingsStore(memoryStorage());
    store.external(encodeSettings({ terrain: "meadow" }));
    expect(store.getState().terrain).toBe("meadow");
  });
});
