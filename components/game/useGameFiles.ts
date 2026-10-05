"use client";

import { useCallback, useMemo, useState } from "react";
import { parseSave, saveFileName, stringifySave, type LoadedSave } from "@/lib/save/file";
import { EMPTY_WORLD, matchesFile, newGame } from "@/lib/save/game";
import { useToast } from "@/components/ui/Toast";
import { useGameStore } from "./GameProvider";

/** A file picked for Load game: read, or refused with the reason. */
export type PendingLoad = { name: string; save: LoadedSave } | { name: string; error: string };

export type GameFiles = ReturnType<typeof useGameFiles>;

/** What a save file holds: YAML text. */
const ACCEPT = ".yaml,.yml,application/yaml,text/yaml";

/** Hands `text` to the browser as a download named `name`. */
function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/yaml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url));
}

/**
 * Save game, Load game and New game. Loading is two steps: `open` reads the
 * file into `pending`, which the load dialog shows, and `replace` puts it on
 * the table. New game opens its dialog (`newGameOpen`), and `startNew` deals
 * an empty or example table.
 */
export function useGameFiles() {
  const { store, example } = useGameStore();
  const toast = useToast();
  const [pending, setPending] = useState<PendingLoad | null>(null);
  const [newGameOpen, setNewGameOpen] = useState(false);

  const save = useCallback(() => {
    const now = new Date();
    const name = saveFileName(now);
    download(stringifySave(store.getState().game.world, now), name);
    store.amend((g) => matchesFile(g, now));
    toast.show({ tone: "done", message: `Saved ${name}` });
  }, [store, toast]);

  /** Reads a picked or dropped file into `pending`. */
  const open = useCallback(async (file: File) => {
    const name = file.name;
    try {
      setPending({ name, save: parseSave(await file.text()) });
    } catch (err) {
      setPending({ name, error: err instanceof Error && err.message ? err.message : "It can't be read" });
    }
  }, []);

  /** Opens the browser's file picker; the picked file goes to `open`. */
  const pick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT;
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) void open(file);
    });
    input.click();
  }, [open]);

  const replace = useCallback(
    (load: { name: string; save: LoadedSave }) => {
      const { world, savedAt } = load.save;
      store.replace(matchesFile(newGame(world, false), savedAt ?? new Date()));
      setPending(null);
      toast.show({ tone: "done", message: `Loaded ${load.name}` });
    },
    [store, toast],
  );

  const startNew = useCallback(
    (table: "empty" | "example") => {
      store.replace(table === "empty" ? newGame(EMPTY_WORLD, false) : newGame(example, true));
      setNewGameOpen(false);
    },
    [store, example],
  );

  return useMemo(
    () => ({
      save,
      pick,
      open,
      pending,
      replace,
      cancelLoad: () => setPending(null),
      newGameOpen,
      openNewGame: () => setNewGameOpen(true),
      closeNewGame: () => setNewGameOpen(false),
      startNew,
    }),
    [save, pick, open, pending, replace, newGameOpen, startNew],
  );
}
