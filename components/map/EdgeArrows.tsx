"use client";

import { useMemo } from "react";
import type { Monster } from "@/lib/types";
import { offscreenArrows } from "@/lib/map/arrows";
import type { MapView } from "./MapCanvas";

const UNFOUGHT = "#dc2626";
/** Arrow button size in screen px. */
const SIZE = 30;

type Props = {
  view: MapView;
  /** Unfought monsters; only the off-screen ones get an arrow. */
  monsters: Monster[];
  onPick: (monster: Monster) => void;
};

/**
 * Screen-space red arrows pinned to the viewport edge, one per off-screen
 * unfought monster, pointing toward it. Render inside MapCanvas' `overlay`
 * (whose container has `pointer-events: none`; the arrows opt back in).
 */
export function EdgeArrows({ view, monsters, onPick }: Props) {
  const { camera, viewport } = view;
  const byId = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const arrows = offscreenArrows(monsters, camera, viewport, { margin: SIZE / 2 + 6, gap: SIZE + 4 });

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
            className="pointer-events-auto absolute flex items-center justify-center rounded-full bg-background/85 shadow-md ring-1 ring-red-600/40 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
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
              <path d="M 10 0 L -6 -8 L -2 0 L -6 8 Z" fill={UNFOUGHT} />
            </svg>
          </button>
        );
      })}
    </>
  );
}
