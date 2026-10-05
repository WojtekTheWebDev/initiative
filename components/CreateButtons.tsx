"use client";

import { Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import type { FigureKind } from "@/components/dialogs/useDialogs";

/** "+ Monster" and "+ Hero" in the top-right HUD cluster; they open the summon and recruit dialogs. */
export function CreateButtons({ onCreate }: { onCreate: (kind: FigureKind) => void }) {
  return (
    <Glass className="flex gap-1.5 p-1.5">
      <Button icon="plus" aria-label="New monster" onClick={() => onCreate("monster")}>
        Monster
      </Button>
      <Button icon="plus" aria-label="New hero" onClick={() => onCreate("hero")}>
        Hero
      </Button>
    </Glass>
  );
}
