"use client";

import { useState } from "react";
import type { World } from "@/lib/types";
import { liveSelection, type PanelSelection } from "./helpers";

/** What the side panel shows besides the selected item's details. */
export type PanelMode =
  | { type: "create"; kind: "monster" | "hero" }
  | { type: "edit" }
  | { type: "trophy"; id: string }
  | null;

export type PanelState = ReturnType<typeof usePanel>;

/**
 * Side panel state on top of Board's map selection.
 * - `selection` is the live selection: `null` once the item is slain or deleted.
 * - Any change of the map selection closes a form or trophy view, so clicking a
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

  // A mode only applies in the context it was opened in.
  let active: PanelMode = mode;
  if (mode?.type === "edit" && !live) active = null;
  if ((mode?.type === "create" || mode?.type === "trophy") && live) active = null;
  if (mode?.type === "trophy" && !world.monsters.some((m) => m.id === mode.id && m.slain)) {
    active = null;
  }

  /** Opens a mode that replaces the selection (create form, trophy details). */
  const open = (next: Exclude<PanelMode, { type: "edit" } | null>) => {
    setSeen(null);
    setSelection(null);
    setMode(next);
  };

  return {
    selection: live,
    mode: active,
    openCreate: (kind: "monster" | "hero") => open({ type: "create", kind }),
    openTrophy: (id: string) => open({ type: "trophy", id }),
    trophyId: active?.type === "trophy" ? active.id : null,
    edit: () => setMode({ type: "edit" }),
    /** Leave a form or trophy view; the selection stays. */
    back: () => setMode(null),
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
