"use client";

import type { MapView } from "./MapCanvas";
import type { FigureDrag } from "./useFigureDrag";
import { OpenTargetPopover } from "./TargetPopover";
import { DragError } from "./DragError";

/**
 * Screen-space pieces of the drag interactions, for MapCanvas' `overlay`:
 * the target popover and the error toast.
 */
export function DragOverlay({ drag, view }: { drag: FigureDrag; view: MapView }) {
  return (
    <>
      <OpenTargetPopover drag={drag} camera={view.camera} />
      {drag.error && <DragError message={drag.error} onDismiss={drag.dismissError} />}
    </>
  );
}
