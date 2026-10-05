"use client";

import { useMemo } from "react";
import type { Monster } from "@/lib/types";
import { offscreenArrows } from "@/lib/map/arrows";
import type { PlacedMonster } from "@/lib/map/layout";
import type { MapView } from "./MapCanvas";

/** Arrow button size in screen px. */
const SIZE = 30;

type Props = {
  view: MapView;
  /** Unfought monsters where they are drawn; only the off-screen ones get an arrow. */
  monsters: PlacedMonster[];
  onPick: (monster: Monster) => void;
};

/**
 * Screen-space red arrows pinned to the viewport edge, one per off-screen
 * unfought monster, pointing toward it. Render inside MapCanvas' `overlay`
 * (whose container has `pointer-events: none`; the arrows opt back in).
 */
export function EdgeArrows({ view, monsters, onPick }: Props) {
  const { camera, viewport } = view;
  const byId = useMemo(() => new Map(monsters.map((m) => [m.monster.id, m.monster])), [monsters]);
  const targets = useMemo(() => monsters.map((m) => ({ id: m.monster.id, pos: m.pos })), [monsters]);
  const arrows = offscreenArrows(targets, camera, viewport, { margin: SIZE / 2 + 6, gap: SIZE + 4 });

  return (
    <>
      {arrows.map((a) => {
        const monster = byId.get(a.id)!;
        return (
          <button
            key={a.id}
            type="button"
            title={`${monster.name} (unfought)`}
            aria-label={`Fly to unfought monster ${monster.name}`}
            className="pointer-events-auto absolute flex items-center justify-center rounded-full border border-hud-danger/60 bg-hud-glass shadow-[0_2px_8px_rgba(0,0,0,0.45)] backdrop-blur-[var(--hud-blur)] hover:scale-110 hover:border-hud-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud-danger motion-safe:transition-transform"
            style={{
              left: a.x - SIZE / 2,
              top: a.y - SIZE / 2,
              width: SIZE,
              height: SIZE,
            }}
            onClick={() => onPick(monster)}
          >
            <svg
              width={SIZE - 8}
              height={SIZE - 8}
              viewBox="-12 -12 24 24"
              aria-hidden="true"
              style={{ transform: `rotate(${a.angle}rad)` }}
            >
              {/* Points right at angle 0. */}
              <path d="M 10 0 L -6 -8 L -2 0 L -6 8 Z" fill="var(--hud-danger)" />
            </svg>
          </button>
        );
      })}
    </>
  );
}
