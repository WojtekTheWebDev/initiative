import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "./game";
import { createTutorialStore, decodeTutorial, TUTORIAL_KEY } from "./tutorial";

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

describe("decodeTutorial", () => {
  it("reads the three statuses and nothing else", () => {
    expect(decodeTutorial("playing")).toBe("playing");
    expect(decodeTutorial("done")).toBe("done");
    expect(decodeTutorial("skipped")).toBe("skipped");
    expect(decodeTutorial(null)).toBeNull();
    expect(decodeTutorial("finished")).toBeNull();
    expect(decodeTutorial('"done"')).toBeNull();
  });
});

describe("createTutorialStore", () => {
  it("opens the welcome dialog on a first visit", () => {
    expect(createTutorialStore(memoryStorage()).getState()).toEqual({ status: null, welcome: true });
  });

  it("keeps the welcome dialog closed for a player who already has a table", () => {
    const store = createTutorialStore(memoryStorage({ [STORAGE_KEY]: "{}" }));
    expect(store.getState()).toEqual({ status: null, welcome: false });
  });

  it("keeps the welcome dialog closed once the player chose, and reads the status", () => {
    for (const status of ["playing", "done", "skipped"] as const) {
      const store = createTutorialStore(memoryStorage({ [TUTORIAL_KEY]: status }));
      expect(store.getState()).toEqual({ status, welcome: false });
    }
  });

  it("treats an unknown stored status as none", () => {
    const store = createTutorialStore(memoryStorage({ [TUTORIAL_KEY]: "nope" }));
    expect(store.getState()).toEqual({ status: null, welcome: true });
  });

  it("stores every status, the latest winning, and closes the welcome dialog", () => {
    const storage = memoryStorage();
    const store = createTutorialStore(storage);
    let calls = 0;
    store.subscribe(() => calls++);
    store.set("playing");
    expect(store.getState()).toEqual({ status: "playing", welcome: false });
    store.set("done");
    store.openWelcome();
    expect(store.getState()).toEqual({ status: "done", welcome: true });
    store.set("skipped");
    expect(store.getState()).toEqual({ status: "skipped", welcome: false });
    expect(storage.data.get(TUTORIAL_KEY)).toBe("skipped");
    expect(calls).toBe(4);
  });

  it("opens the welcome dialog only once", () => {
    const store = createTutorialStore(memoryStorage({ [TUTORIAL_KEY]: "done" }));
    let calls = 0;
    store.subscribe(() => calls++);
    store.openWelcome();
    store.openWelcome();
    expect(calls).toBe(1);
  });

  it("carries on in memory when the browser won't store", () => {
    const storage = memoryStorage();
    storage.fail = true;
    const store = createTutorialStore(storage);
    expect(store.getState()).toEqual({ status: null, welcome: true });
    store.set("playing");
    expect(store.getState().status).toBe("playing");
    expect(createTutorialStore(null).getState()).toEqual({ status: null, welcome: true });
  });

  it("takes in a status from another tab, which answers the welcome dialog", () => {
    const store = createTutorialStore(memoryStorage());
    store.external("skipped");
    expect(store.getState()).toEqual({ status: "skipped", welcome: false });
    store.openWelcome();
    store.external(null);
    expect(store.getState()).toEqual({ status: null, welcome: true });
  });
});
