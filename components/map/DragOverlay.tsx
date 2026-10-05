"use client";

import type { MapView } from "./MapCanvas";
import type { FigureDrag } from "./useFigureDrag";
import { OpenTargetButtons } from "./TargetButtons";

/** Screen-space pieces of the drag interactions, for MapCanvas' `overlay`: the target arrow buttons. */
export function DragOverlay({ drag, view }: { drag: FigureDrag; view: MapView }) {
  return <OpenTargetButtons drag={drag} camera={view.camera} />;
}
