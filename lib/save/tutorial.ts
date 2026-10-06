import { STORAGE_KEY } from "./game";

/**
 * Where this browser stands with the tutorial. Like the settings, it belongs
 * to the browser, not to the table: it is kept in local storage next to the
 * game and never goes into a save file. Which step the player is on is never
 * stored; it is worked out from the table (`tutorialStage` in
 * components/tutorial/stage.ts). Pure apart from the `Storage` handed to
 * `createTutorialStore`, so it runs in Vitest with an in-memory storage.
 */
export type TutorialStatus = "playing" | "done" | "skipped";

/** The local-storage key holding the tutorial's status as plain text. */
export const TUTORIAL_KEY = "initiative.tutorial";

const STATUSES: readonly TutorialStatus[] = ["playing", "done", "skipped"];

/** The stored status, or null when there is none or it isn't one. */
export function decodeTutorial(raw: string | null): TutorialStatus | null {
  return STATUSES.find((s) => s === raw) ?? null;
}

export type TutorialState = {
  /** The last outcome, or "playing" while the tutorial runs; null before the player first chose. */
  status: TutorialStatus | null;
  /** The welcome dialog is open: on a first visit, or after Play the tutorial in the game menu. */
  welcome: boolean;
};

export type TutorialStore = {
  getState(): TutorialState;
  subscribe(listener: () => void): () => void;
  /** Stores a status (start, skip or finish) and closes the welcome dialog. */
  set(status: TutorialStatus): void;
  /** Opens the welcome dialog again (Play the tutorial). */
  openWelcome(): void;
  /** Takes in a status another tab stored (from the `storage` event). */
  external(raw: string | null): void;
};

/**
 * The tutorial's status, kept in `storage` under `TUTORIAL_KEY`. The welcome
 * dialog opens by itself only on a first visit: nothing stored for the
 * tutorial and no stored game. A browser that won't store the status keeps
 * it until the tab closes.
 */
export function createTutorialStore(storage: Storage | null): TutorialStore {
  let state: TutorialState = { status: null, welcome: true };
  try {
    const status = decodeTutorial(storage?.getItem(TUTORIAL_KEY) ?? null);
    state = { status, welcome: status === null && (storage?.getItem(STORAGE_KEY) ?? null) === null };
  } catch {
    // Unreadable storage: nothing is known, so it is a first visit.
  }
  const listeners = new Set<() => void>();
  const setState = (next: TutorialState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(status) {
      try {
        storage?.setItem(TUTORIAL_KEY, status);
      } catch {
        // The game's own storage alarm already tells the player this browser won't keep things.
      }
      setState({ status, welcome: false });
    },
    openWelcome() {
      if (!state.welcome) setState({ ...state, welcome: true });
    },
    external(raw) {
      const status = decodeTutorial(raw);
      // A choice made in another tab answers this tab's welcome dialog too.
      setState({ status, welcome: state.welcome && status === null });
    },
  };
}
