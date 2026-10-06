"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { Mini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { IconButton } from "@/components/ui/Button";
import { wrapStep } from "./helpers";

/** Diameter of the mini on show, in px; half that on a phone (`compact`). */
const PREVIEW = 200;

/**
 * A figure's mini, large, with arrows to flip through `roster` (wrapping at
 * both ends) and a count such as "2 of 6". Arrow keys flip it while it has
 * focus. `index` is the mini on show and `name` its label; `note` goes under
 * the count, e.g. to say a pick is missing.
 */
export function MiniCarousel({
  roster,
  index,
  name,
  note,
  onFlip,
}: {
  roster: readonly Mini[];
  index: number;
  name: string;
  note?: ReactNode;
  onFlip: (mini: Mini) => void;
}) {
  const flip = (delta: number) => onFlip(roster[wrapStep(index, delta, roster.length)]);

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
        <Portrait mini={roster[index]} size={PREVIEW} ring="gold" className="compact:[zoom:0.5]" />
        <IconButton label="Next mini" icon="chevronRight" tabIndex={-1} onClick={() => flip(1)} />
      </div>
      <p className="font-display mt-3 text-sm tracking-[0.08em] text-hud-gold uppercase" aria-live="polite">
        {name}
      </p>
      <p className="text-xs text-hud-muted">
        {index + 1} of {roster.length}
      </p>
      {note}
    </div>
  );
}

/** A line under the carousel saying the figure's pick is missing from the roster. */
export function MissingNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-2 max-w-56 text-center text-xs text-[#ff9a9d]">
      {children}
    </p>
  );
}
