"use client";

import { useEffect, useRef } from "react";
import type { Pos } from "@/lib/types";
import { worldToScreen, type Camera } from "@/lib/map/camera";
import { linksOf } from "@/lib/map/links";
import type { FigureDrag } from "./useFigureDrag";
import { Button } from "@/components/ui/Button";

/** The popover for the arrow the user clicked (`drag.link`), placed at the arrow's midpoint. */
export function OpenTargetPopover({ drag, camera }: { drag: FigureDrag; camera: Camera }) {
  const ref = drag.link;
  if (!ref) return null;
  const placed = linksOf(drag.layout).find((l) => l.heroId === ref.heroId && l.monsterId === ref.monsterId);
  const hero = drag.layout.heroes.find((h) => h.hero.id === ref.heroId)?.hero;
  const monster = drag.layout.monsters.find((m) => m.monster.id === ref.monsterId)?.monster;
  if (!placed || !hero || !monster) return null;
  const mid = { x: (placed.from.x + placed.to.x) / 2, y: (placed.from.y + placed.to.y) / 2 };
  return (
    <TargetPopover
      key={`${ref.heroId}:${ref.monsterId}`}
      anchor={worldToScreen(camera, mid)}
      heroName={hero.name}
      monsterName={monster.name}
      main={placed.main}
      onMakeMain={() => drag.makeMain(ref)}
      onRemove={() => drag.removeTarget(ref)}
      onClose={drag.closeLink}
    />
  );
}

/** Screen px between the arrow's midpoint and the top of the popover. */
const OFFSET = 10;

type Props = {
  /** Screen point (relative to the canvas) of the arrow's midpoint. */
  anchor: Pos;
  heroName: string;
  monsterName: string;
  /** The arrow points at the hero's main target, so there is nothing to make main. */
  main: boolean;
  onMakeMain: () => void;
  onRemove: () => void;
  onClose: () => void;
};

/**
 * Popover for a target arrow (a hero and one of its targets): Make main / Remove target.
 * Lives in the canvas' screen-space overlay. Closes on Esc or a press outside it.
 */
export function TargetPopover({ anchor, heroName, monsterName, main, onMakeMain, onRemove, onClose }: Props) {
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
      aria-label={`${heroName} → ${monsterName}`}
      data-target-popover=""
      className="hud-glass pointer-events-auto absolute z-10 w-max -translate-x-1/2 p-2 text-sm"
      style={{ left: anchor.x, top: anchor.y + OFFSET }}
    >
      <p className="mb-2 max-w-56 px-1 text-xs text-hud-muted">
        <span className="font-medium text-hud-fg">{heroName}</span> →{" "}
        <span className="font-medium text-hud-fg">{monsterName}</span>
        {main ? " (main target)" : " (secondary target)"}
      </p>
      <div className="flex gap-1.5">
        {!main && (
          <Button tone="primary" icon="crown" autoFocus className="h-8" onClick={onMakeMain}>
            Make main
          </Button>
        )}
        <Button tone="danger" icon="shears" autoFocus={main} className="h-8" onClick={onRemove}>
          Remove target
        </Button>
      </div>
    </div>
  );
}
