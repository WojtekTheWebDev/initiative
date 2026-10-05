"use client";

import { useMemo, useState, type RefObject } from "react";
import type { World } from "@/lib/types";
import type { ShelfHint } from "@/components/map/useFigureDrag";
import { Icon } from "@/components/ui/icons";
import { trophiesOf } from "./trophies";
import { TrophyHall } from "./TrophyHall";

const GLOW: Record<ShelfHint, string> = {
  armed: "border-hud-gold/80 shadow-[0_0_18px_rgba(217,180,95,0.45)]",
  over: "border-hud-gold bg-hud-gold/20 shadow-[0_0_30px_rgba(217,180,95,0.85)] scale-105",
};

/**
 * The trophy shelf in the bottom-left corner of the HUD: a trophy icon and
 * the trophy count. A click opens the trophy hall. It is also the drop target for slaying: `shelfRef` lets the drag
 * hit-test it, and while a monster is dragged (`hint`) it glows gold,
 * brighter while the monster is over it.
 */
export function TrophyShelf({
  world,
  shelfRef,
  hint,
}: {
  world: World;
  shelfRef: RefObject<HTMLElement | null>;
  hint: ShelfHint | null;
}) {
  const [hallOpen, setHallOpen] = useState(false);
  const trophies = useMemo(() => trophiesOf(world.monsters), [world.monsters]);
  const count = `${trophies.length} ${trophies.length === 1 ? "trophy" : "trophies"}`;

  return (
    <>
      <div
        ref={(el) => {
          shelfRef.current = el;
        }}
        className={`hud-glass relative origin-bottom-left rounded-hud motion-safe:transition-[box-shadow,transform,background-color] ${hint ? GLOW[hint] : ""}`}
      >
        {hint && (
          <span className="pointer-events-none absolute bottom-full left-0 mb-2 text-sm font-semibold whitespace-nowrap text-hud-gold [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
            Drop to slay
          </span>
        )}
        <button
          type="button"
          aria-label={`Open the trophy hall (${count})`}
          className="flex h-14 cursor-pointer items-center gap-3 rounded-hud px-3.5 hover:bg-white/5"
          onClick={() => setHallOpen(true)}
        >
          <Icon.trophy className="size-5 text-hud-gold" />
          <span className="font-display text-sm tracking-[0.08em] text-hud-gold uppercase">
            {trophies.length === 0 ? "No trophies yet" : count}
          </span>
        </button>
      </div>
      <TrophyHall world={world} open={hallOpen} onClose={() => setHallOpen(false)} />
    </>
  );
}
