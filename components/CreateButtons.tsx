"use client";

import { Glass } from "@/components/ui/Glass";
import { Button } from "@/components/ui/Button";
import type { FigureKind } from "@/components/dialogs/useDialogs";

/** The tutorial's glow around the button the coach card points at. */
export const BECKON = "outline-2 outline-offset-2 outline-hud-gold motion-safe:animate-hud-beckon";

/**
 * "+ Monster" and "+ Hero" in the top-right HUD cluster; they open the summon
 * and recruit dialogs. In a narrow window they stack, so the wordmark fits
 * beside them. `beckon` makes one glow while the tutorial points at it.
 */
export function CreateButtons({
  onCreate,
  beckon = null,
}: {
  onCreate: (kind: FigureKind) => void;
  beckon?: FigureKind | null;
}) {
  return (
    <Glass className="flex gap-1.5 p-1.5 max-sm:flex-col">
      <Button
        icon="plus"
        aria-label="New monster"
        className={beckon === "monster" ? BECKON : ""}
        onClick={() => onCreate("monster")}
      >
        Monster
      </Button>
      <Button
        icon="plus"
        aria-label="New hero"
        className={beckon === "hero" ? BECKON : ""}
        onClick={() => onCreate("hero")}
      >
        Hero
      </Button>
    </Glass>
  );
}
