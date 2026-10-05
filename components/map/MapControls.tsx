"use client";

import { useState, type RefObject } from "react";
import { ZOOM_STEP } from "@/lib/map/camera";
import { Glass } from "@/components/ui/Glass";
import { IconButton } from "@/components/ui/Button";
import { ShortcutsSheet } from "@/components/ShortcutsSheet";
import { useShortcuts } from "@/components/useShortcuts";
import type { MapHandle } from "./MapCanvas";

/**
 * The bottom-right HUD cluster: zoom in, zoom out, fit everything and the
 * shortcuts sheet. It also binds the table's keyboard shortcuts, so the keys
 * and the buttons do the same thing; `newMonster` and `newHero` are what the
 * create buttons do.
 */
export function MapControls({
  map,
  newMonster,
  newHero,
}: {
  map: RefObject<MapHandle | null>;
  newMonster: () => void;
  newHero: () => void;
}) {
  const [sheet, setSheet] = useState(false);
  const zoomIn = () => map.current?.zoomBy(ZOOM_STEP);
  const zoomOut = () => map.current?.zoomBy(1 / ZOOM_STEP);
  const fit = () => map.current?.fitAll();
  const help = () => setSheet(true);
  useShortcuts({ newMonster, newHero, fit, zoomIn, zoomOut, help });

  return (
    <>
      <Glass className="flex flex-col gap-1 p-1">
        <IconButton label="Zoom in" title="Zoom in (+)" icon="zoomIn" onClick={zoomIn} />
        <IconButton label="Zoom out" title="Zoom out (-)" icon="zoomOut" onClick={zoomOut} />
        <IconButton label="Fit everything" title="Fit everything (F)" icon="fit" onClick={fit} />
        <IconButton label="Shortcuts" title="Shortcuts (?)" icon="help" onClick={help} />
      </Glass>
      <ShortcutsSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  );
}
