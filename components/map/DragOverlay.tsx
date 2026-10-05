"use client";

import type { MapView } from "./MapCanvas";
import type { FigureDrag } from "./useFigureDrag";
import { OpenTargetPopover } from "./TargetPopover";

/** Screen-space pieces of the drag interactions, for MapCanvas' `overlay`: the target popover. */
export function DragOverlay({ drag, view }: { drag: FigureDrag; view: MapView }) {
  return <OpenTargetPopover drag={drag} camera={view.camera} />;
}
