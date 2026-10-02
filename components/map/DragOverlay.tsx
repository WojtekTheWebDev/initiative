"use client";

import { worldToScreen } from "@/lib/map/camera";
import { GHOST_RADIUS } from "@/lib/map/layout";
import type { MapView } from "./MapCanvas";
import type { FigureDrag } from "./useFigureDrag";
import { GhostPopover } from "./GhostPopover";
import { DragError } from "./DragError";

/**
 * Screen-space pieces of the drag interactions, for MapCanvas' `overlay`:
 * the border glow while a monster crosses x = 0, the ghost popover and the error toast.
 */
export function DragOverlay({ drag, view }: { drag: FigureDrag; view: MapView }) {
  const { camera } = view;
  const borderX = worldToScreen(camera, { x: 0, y: 0 }).x;
  const ghost = drag.ghost;
  const placed = ghost
    ? drag.layout.ghosts.find((g) => g.hero.id === ghost.heroId && g.monsterId === ghost.monsterId)
    : undefined;
  const monster = placed
    ? drag.layout.monsters.find((m) => m.monster.id === placed.monsterId)?.monster
    : undefined;

  return (
    <>
      {drag.crossing && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-1.5 -translate-x-1/2 bg-amber-400/70 shadow-[0_0_14px_4px_rgba(251,191,36,0.55)]"
          style={{ left: borderX }}
        />
      )}
      {ghost && placed && monster && (
        <GhostPopover
          key={`${ghost.heroId}:${ghost.monsterId}`}
          anchor={worldToScreen(camera, placed.pos)}
          offset={GHOST_RADIUS * camera.scale}
          heroName={placed.hero.name}
          monsterName={monster.name}
          onMakeMain={() => drag.makeMain(ghost)}
          onRemove={() => drag.removeTarget(ghost)}
          onClose={drag.closeGhost}
        />
      )}
      {drag.error && <DragError message={drag.error} onDismiss={drag.dismissError} />}
    </>
  );
}
