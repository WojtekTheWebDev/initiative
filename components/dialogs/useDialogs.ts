"use client";

import { useState } from "react";

export type FigureKind = "monster" | "hero";

/** Which dialog is open: a create dialog, or an edit dialog for one figure. */
export type OpenDialog = { kind: FigureKind; id?: string } | null;

export type Dialogs = ReturnType<typeof useDialogs>;

/**
 * The monster and hero dialogs' state, so anything on the board (the create
 * buttons, keyboard shortcuts, a figure card) can open them.
 */
export function useDialogs() {
  const [open, setOpen] = useState<OpenDialog>(null);
  return {
    open,
    /** Opens "Summon a monster" or "Recruit a hero". */
    openCreate: (kind: FigureKind) => setOpen({ kind }),
    /** Opens "Edit monster" or "Edit hero" for the figure with this id. */
    openEdit: (kind: FigureKind, id: string) => setOpen({ kind, id }),
    close: () => setOpen(null),
  };
}
