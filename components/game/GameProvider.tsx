"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { World } from "@/lib/types";
import { createGameStore, STORAGE_KEY, type GameState, type GameStore } from "@/lib/save/game";
import { createSettingsStore, DEFAULT_SETTINGS, SETTINGS_KEY, type Settings, type SettingsStore } from "@/lib/save/settings";
import { createTutorialStore, TUTORIAL_KEY, type TutorialState, type TutorialStore } from "@/lib/save/tutorial";
import { useToast } from "@/components/ui/Toast";

type GameStores = { store: GameStore; example: World; settings: SettingsStore; tutorial: TutorialStore };
type GameContextValue = GameStores | null;

const GameContext = createContext<GameContextValue>(null);

/** The browser's local storage, or null where reading it throws (some private windows, blocked site data). */
function localStorageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Holds the game, the settings and the tutorial's status in the browser's
 * local storage (see `createGameStore`, `createSettingsStore` and
 * `createTutorialStore`). The server has no game, so it renders the children
 * without one; the browser reads the stored game, or deals `example`, once it
 * hydrates. Whatever another tab stores is taken in through the `storage` event.
 */
export function GameProvider({ example, children }: { example: World; children: ReactNode }) {
  const [value] = useState<GameContextValue>(() => {
    if (typeof window === "undefined") return null;
    const storage = localStorageOrNull();
    // The tutorial store reads first: it looks for a stored game, which the game store stores once it changes.
    const tutorial = createTutorialStore(storage);
    return { store: createGameStore(storage, example), example, settings: createSettingsStore(storage), tutorial };
  });

  useEffect(() => {
    if (!value) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) value.store.external(e.newValue);
      if (e.key === SETTINGS_KEY) value.settings.external(e.newValue);
      if (e.key === TUTORIAL_KEY) value.tutorial.external(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [value]);

  return <GameContext value={value}>{children}</GameContext>;
}

const noSubscribe = () => () => {};
const noState = () => null;

/** The game, or null until the browser has read it (always null on the server). */
export function useGameState(): GameState | null {
  const value = useContext(GameContext);
  return useSyncExternalStore(
    value?.store.subscribe ?? noSubscribe,
    value?.store.getState ?? noState,
    noState,
  );
}

/** The game, inside the parts of the page that only render once it is read. */
export function useGame(): GameState {
  const state = useGameState();
  if (!state) throw new Error("useGame() needs the game to be read; render it under <GameScreen>");
  return state;
}

const defaultSettings = () => DEFAULT_SETTINGS;

/** This browser's settings (the defaults on the server). */
export function useSettings(): Settings {
  const value = useContext(GameContext);
  return useSyncExternalStore(
    value?.settings.subscribe ?? noSubscribe,
    value?.settings.getState ?? defaultSettings,
    defaultSettings,
  );
}

const NO_TUTORIAL: TutorialState = { status: null, welcome: false };
const noTutorial = () => NO_TUTORIAL;

/** Where this browser stands with the tutorial (nothing open on the server). */
export function useTutorial(): TutorialState {
  const value = useContext(GameContext);
  return useSyncExternalStore(
    value?.tutorial.subscribe ?? noSubscribe,
    value?.tutorial.getState ?? noTutorial,
    noTutorial,
  );
}

/** The game, settings and tutorial stores and the example table, for code that changes them. */
export function useGameStore(): GameStores {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGameStore() needs a <GameProvider> in the browser");
  return value;
}

/**
 * Applies a change to the table and returns the new world. A change the
 * rules refuse (an id that is gone, say) leaves the table as it was, shows
 * "Couldn't <what>: <reason>." and returns null.
 */
export function useGameUpdate(): (what: string, fn: (world: World) => World) => World | null {
  const { store } = useGameStore();
  const toast = useToast();
  return useCallback(
    (what, fn) => {
      try {
        return store.update(fn);
      } catch (err) {
        const reason = err instanceof Error && err.message ? err.message : "something went wrong";
        toast.show({ tone: "error", message: `Couldn't ${what}: ${reason}.` });
        return null;
      }
    },
    [store, toast],
  );
}
