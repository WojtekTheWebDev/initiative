"use client";

import { useState } from "react";
import type { World } from "@/lib/types";
import { liveSelection, type PanelSelection } from "./helpers";

/** What the side panel shows instead of the selected item's details. */
export type PanelMode = { type: "trophy"; id: string } | null;

export type PanelState = ReturnType<typeof usePanel>;

/**
 * Side panel state on top of Board's map selection.
 * - `selection` is the live selection: `null` once the item is slain or deleted.
 * - Any change of the map selection closes the trophy view, so clicking a
 *   figure always shows that figure.
 */
export function usePanel<S extends PanelSelection>(
  world: World,
  selection: S,
  setSelection: (s: S | null) => void,
) {
  const [mode, setMode] = useState<PanelMode>(null);
  const [seen, setSeen] = useState<S | null>(selection);
  const live = liveSelection(world, selection);

  // Adjust state while rendering (instead of an effect) when the selection changes.
  if (seen !== selection) {
    setSeen(selection);
    if (mode) setMode(null);
  }

  // The trophy view replaces the selection, and applies only while that monster is slain.
  const active: PanelMode =
    mode && !live && world.monsters.some((m) => m.id === mode.id && m.slain) ? mode : null;

  /** Opens a trophy's details, which replace the selection. */
  const openTrophy = (id: string) => {
    setSeen(null);
    setSelection(null);
    setMode({ type: "trophy", id });
  };

  return {
    selection: live,
    mode: active,
    openTrophy,
    trophyId: active?.id ?? null,
    select: (s: S | null) => {
      setMode(null);
      setSelection(s);
    },
    close: () => {
      setMode(null);
      setSelection(null);
    },
  };
}
