"use client";

import { useState } from "react";
import type { World } from "@/lib/types";

/** The figure whose card is open. */
export type Selection = { kind: "monster" | "hero"; id: string } | null;

/**
 * The selection if it still points at a living monster or an existing hero,
 * otherwise `null` (the item was slain or deleted, maybe in another tab).
 */
export function liveSelection(world: World, selection: Selection): Selection {
  if (!selection) return null;
  if (selection.kind === "monster") {
    return world.monsters.some((m) => m.id === selection.id && !m.slain) ? selection : null;
  }
  return world.heroes.some((h) => h.id === selection.id) ? selection : null;
}

/** The selected figure: `selection` is `null` once it is slain or deleted, so its card closes. */
export function useSelection(world: World) {
  const [picked, select] = useState<Selection>(null);
  return { selection: liveSelection(world, picked), select };
}
