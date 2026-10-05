"use client";

import { useEffect, useRef } from "react";
import type { World } from "@/lib/types";
import { Board } from "@/components/Board";
import { useToast } from "@/components/ui/Toast";
import { GameProvider, useGameState } from "./GameProvider";
import { GameDialogs } from "./GameDialogs";
import { FileDrop } from "./FileDrop";
import { useGameFiles } from "./useGameFiles";

/**
 * The whole app: the game kept in this browser, its board, and the file
 * dialogs. `example` is the table a first visit (or New game) starts with.
 */
export function Game({ example }: { example: World }) {
  return (
    <GameProvider example={example}>
      <GameScreen />
    </GameProvider>
  );
}

function GameScreen() {
  const state = useGameState();
  // The felt shows until the browser has read the game (the server has none).
  if (!state) return <div className="h-dvh w-full bg-hud-ground" />;
  return <LoadedGame />;
}

function LoadedGame() {
  const state = useGameState()!;
  const files = useGameFiles();
  useStorageAlarm(state.storage === "failed", files.save);

  return (
    <>
      {/* A loaded or new game starts a fresh board: opening view, nothing selected. */}
      <Board key={state.generation} files={files} />
      <GameDialogs files={files} />
      <FileDrop onFile={files.open} />
    </>
  );
}

/**
 * When the browser refuses to keep the table, a red toast says so until it
 * is dismissed, with a button to save the game to a file.
 */
function useStorageAlarm(failed: boolean, save: () => void) {
  const toast = useToast();
  const latestSave = useRef(save);
  useEffect(() => {
    latestSave.current = save;
  });
  useEffect(() => {
    if (!failed) return;
    toast.show({
      tone: "error",
      stay: true,
      message: "This browser won't keep the table, so changes last only until you close the tab.",
      action: { label: "Save game", icon: "save", run: () => latestSave.current() },
    });
  }, [failed, toast]);
}
