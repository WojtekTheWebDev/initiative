"use client";

import { Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import type { FigureKind } from "@/components/dialogs/useDialogs";

/**
 * "+ Monster" and "+ Hero" in the top-right HUD cluster; they open the summon
 * and recruit dialogs. In a narrow window they stack, so the wordmark fits
 * beside them.
 */
export function CreateButtons({ onCreate }: { onCreate: (kind: FigureKind) => void }) {
  return (
    <Glass className="flex gap-1.5 p-1.5 max-sm:flex-col">
      <Button icon="plus" aria-label="New monster" onClick={() => onCreate("monster")}>
        Monster
      </Button>
      <Button icon="plus" aria-label="New hero" onClick={() => onCreate("hero")}>
        Hero
      </Button>
    </Glass>
  );
}
