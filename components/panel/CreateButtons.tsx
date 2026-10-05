"use client";

import { Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import type { PanelState } from "./usePanel";

/** "+ Monster" and "+ Hero" in the top-right HUD cluster; they open the create forms in the side panel. */
export function CreateButtons({ panel }: { panel: PanelState }) {
  return (
    <Glass className="flex gap-1.5 p-1.5">
      <Button icon="plus" aria-label="New monster" onClick={() => panel.openCreate("monster")}>
        Monster
      </Button>
      <Button icon="plus" aria-label="New hero" onClick={() => panel.openCreate("hero")}>
        Hero
      </Button>
    </Glass>
  );
}
