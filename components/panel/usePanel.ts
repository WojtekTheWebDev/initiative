"use client";

import { useState } from "react";

export type PanelState = ReturnType<typeof usePanel>;

/** Which create form the create panel shows, if any. */
export function usePanel() {
  const [creating, setCreating] = useState<"monster" | "hero" | null>(null);
  return {
    creating,
    openCreate: (kind: "monster" | "hero") => setCreating(kind),
    close: () => setCreating(null),
  };
}
