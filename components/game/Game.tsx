"use client";

import { useEffect, useRef } from "react";
import type { World } from "@/lib/types";
import { Board } from "@/components/Board";
import { useToast } from "@/components/ui/Toast";
import { TutorialDialogs } from "@/components/tutorial/TutorialDialogs";
import { GameProvider, useGameState, useTutorial } from "./GameProvider";
import { GameDialogs } from "./GameDialogs";
import { FileDrop } from "./FileDrop";
import { useGameFiles } from "./useGameFiles";

/**
 * The whole app: the game kept in this browser, its board, the file dialogs
 * and the tutorial's dialogs. `example` is the table a first visit gets when
 * it skips the tutorial (and New game offers).
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
  const tutorial = useTutorial();
  const files = useGameFiles();
  useStorageAlarm(state.storage === "failed", files.save);
  // The welcome dialog over the untouched example shows bare felt: the example is only dealt if the tutorial is skipped.
  const bare = tutorial.welcome && state.game.example;

  return (
    <>
      {/* A loaded or new game starts a fresh board: opening view, nothing selected. */}
      {bare ? <div className="h-dvh w-full bg-hud-ground" /> : <Board key={state.generation} files={files} />}
      <GameDialogs files={files} />
      <TutorialDialogs files={files} />
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
