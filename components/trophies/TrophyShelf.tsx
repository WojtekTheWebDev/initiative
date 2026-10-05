"use client";

import { useMemo, useState, type RefObject } from "react";
import type { World } from "@/lib/types";
import { monsterMini } from "@/lib/map/minis";
import type { ShelfHint } from "@/components/map/useFigureDrag";
import { Portrait } from "@/components/ui/Portrait";
import { Icon } from "@/components/ui/icons";
import { dayLabel, trophiesOf } from "./trophies";
import { TrophyHall } from "./TrophyHall";

/** Bronzed minis on the shelf before the rest fold into "+N". */
const SHOWN = 5;

const GLOW: Record<ShelfHint, string> = {
  armed: "border-hud-gold/80 shadow-[0_0_18px_rgba(217,180,95,0.45)]",
  over: "border-hud-gold bg-hud-gold/20 shadow-[0_0_30px_rgba(217,180,95,0.85)] scale-105",
};

/**
 * The trophy shelf at the bottom centre of the HUD: the latest slain monsters
 * as bronzed minis, newest on the left (hover one for its name and slain
 * date), "+N" for the rest and the trophy count. A click opens the trophy
 * hall. It is also the drop target for slaying: `shelfRef` lets the drag
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
  const shown = trophies.slice(0, SHOWN);
  const rest = trophies.length - shown.length;
  const count = `${trophies.length} ${trophies.length === 1 ? "trophy" : "trophies"}`;

  return (
    <>
      <div
        ref={(el) => {
          shelfRef.current = el;
        }}
        className={`hud-glass relative rounded-hud motion-safe:transition-[box-shadow,transform,background-color] ${hint ? GLOW[hint] : ""}`}
      >
        {hint && (
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 text-sm font-semibold whitespace-nowrap text-hud-gold [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
            Drop to slay
          </span>
        )}
        <button
          type="button"
          aria-label={`Open the trophy hall (${count})`}
          className="flex h-14 cursor-pointer items-center gap-3 rounded-hud px-3.5 hover:bg-white/5"
          onClick={() => setHallOpen(true)}
        >
          <span className="flex items-center gap-1.5 font-display text-sm text-hud-gold">
            <Icon.trophy className="size-5" />
            {trophies.length}
          </span>
          {shown.length === 0 ? (
            <span className="text-sm text-hud-muted">No trophies yet</span>
          ) : (
            <span className="flex items-center gap-1.5">
              {shown.map((m) => (
                <span key={m.id} className="group/mini relative block">
                  <Portrait mini={monsterMini(m.size)} size={38} bronze />
                  <span
                    role="tooltip"
                    className="hud-glass pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 px-2.5 py-1 text-left text-xs whitespace-nowrap group-hover/mini:block"
                  >
                    <span className="block text-hud-fg">{m.name}</span>
                    <span className="block text-hud-muted">Slain {dayLabel(m.slain)}</span>
                  </span>
                </span>
              ))}
              {rest > 0 && <span className="pl-1 text-sm text-hud-muted">+{rest}</span>}
            </span>
          )}
        </button>
      </div>
      <TrophyHall world={world} open={hallOpen} onClose={() => setHallOpen(false)} />
    </>
  );
}
