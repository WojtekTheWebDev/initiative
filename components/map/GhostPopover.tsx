"use client";

import { useEffect, useRef } from "react";
import type { Pos } from "@/lib/types";

type Props = {
  /** Screen point (relative to the canvas) of the ghost's center. */
  anchor: Pos;
  /** Ghost radius in screen px, so the popover sits just below the marker. */
  offset: number;
  heroName: string;
  monsterName: string;
  onMakeMain: () => void;
  onRemove: () => void;
  onClose: () => void;
};

/**
 * Popover for a ghost (a hero's secondary target): Make main / Remove.
 * Lives in the canvas' screen-space overlay. Closes on Esc or a press outside it.
 */
export function GhostPopover({ anchor, offset, heroName, monsterName, onMakeMain, onRemove, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // tells the side panel this Esc is taken
        onCloseRef.current();
      }
    };
    // Capture phase, so a press that starts a pan or drag still closes it.
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${heroName} on ${monsterName}`}
      data-ghost-popover=""
      className="pointer-events-auto absolute z-10 w-max -translate-x-1/2 rounded-md border border-foreground/15 bg-background p-2 text-sm shadow-lg"
      style={{ left: anchor.x, top: anchor.y + offset + 6 }}
    >
      <p className="mb-2 max-w-56 px-1 text-xs opacity-70">
        <span className="font-medium opacity-100">{heroName}</span> is also on{" "}
        <span className="font-medium opacity-100">{monsterName}</span>
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          autoFocus
          className="rounded bg-foreground px-2.5 py-1 font-medium text-background hover:opacity-90"
          onClick={onMakeMain}
        >
          Make main
        </button>
        <button
          type="button"
          className="rounded border border-foreground/20 px-2.5 py-1 hover:bg-foreground/10"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
