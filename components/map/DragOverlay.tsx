"use client";

import { worldToScreen } from "@/lib/map/camera";
import { GHOST_RADIUS } from "@/lib/map/layout";
import type { MapView } from "./MapCanvas";
import type { FigureDrag } from "./useFigureDrag";
import { GhostPopover } from "./GhostPopover";
import { DragError } from "./DragError";

/**
 * Screen-space pieces of the drag interactions, for MapCanvas' `overlay`:
 * the ghost popover and the error toast.
 */
export function DragOverlay({ drag, view }: { drag: FigureDrag; view: MapView }) {
  const { camera } = view;
  const ghost = drag.ghost;
  const placed = ghost
    ? drag.layout.ghosts.find((g) => g.hero.id === ghost.heroId && g.monsterId === ghost.monsterId)
    : undefined;
  const monster = placed
    ? drag.layout.monsters.find((m) => m.monster.id === placed.monsterId)?.monster
    : undefined;

  return (
    <>
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
