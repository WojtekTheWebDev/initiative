"use client";

import type { PanelState } from "./usePanel";

/** "+ Monster" and "+ Hero" for the header; they open the create forms in the side panel. */
export function CreateButtons({ panel }: { panel: PanelState }) {
  const cls =
    "rounded-md border border-foreground/20 px-2.5 py-1 text-sm font-medium hover:bg-foreground/10";
  return (
    <>
      <button type="button" className={cls} onClick={() => panel.openCreate("monster")}>
        + Monster
      </button>
      <button type="button" className={cls} onClick={() => panel.openCreate("hero")}>
        + Hero
      </button>
    </>
  );
}
