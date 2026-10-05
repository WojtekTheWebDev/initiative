"use client";

import type { KeyboardEvent } from "react";
import { HERO_MINIS } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { IconButton } from "@/components/ui/Button";
import { miniValue, rosterIndex, wrapStep } from "./helpers";

/** Diameter of the mini on show, in px. */
const PREVIEW = 200;

/**
 * The hero's mini, large, with arrows to flip through the roster (Neutral
 * first, wrapping at both ends) and a count such as "4 of 8". Arrow keys
 * flip it while it has focus. `value` is the hero's `mini` ("" for none); a
 * pick that isn't in the roster shows as missing, with Neutral on show.
 */
export function MiniCarousel({ value, onChange }: { value: string; onChange: (mini: string) => void }) {
  const { index, missing } = rosterIndex(HERO_MINIS, value);
  const mini = HERO_MINIS[index];
  const name = index === 0 ? "Neutral" : mini.name;
  const flip = (delta: number) => onChange(miniValue(HERO_MINIS[wrapStep(index, delta, HERO_MINIS.length)]));

  const onKeyDown = (e: KeyboardEvent) => {
    const delta = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    flip(delta);
  };

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Mini"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex flex-col items-center rounded-[12px] p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud-gold"
    >
      <div className="flex items-center gap-2">
        <IconButton label="Previous mini" icon="chevronLeft" tabIndex={-1} onClick={() => flip(-1)} />
        <Portrait mini={mini} size={PREVIEW} ring="gold" />
        <IconButton label="Next mini" icon="chevronRight" tabIndex={-1} onClick={() => flip(1)} />
      </div>
      <p className="font-display mt-3 text-sm tracking-[0.08em] text-hud-gold uppercase" aria-live="polite">
        {name}
      </p>
      <p className="text-xs text-hud-muted">
        {index + 1} of {HERO_MINIS.length}
      </p>
      {missing && (
        <p role="status" className="mt-2 max-w-56 text-center text-xs text-[#ff9a9d]">
          &ldquo;{value}&rdquo; is missing, so this hero stands as Neutral. Flip to choose again.
        </p>
      )}
    </div>
  );
}
