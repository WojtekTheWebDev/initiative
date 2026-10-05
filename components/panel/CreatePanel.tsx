"use client";

import type { RefObject } from "react";
import type { Pos } from "@/lib/types";
import type { MapHandle } from "@/components/map/MapCanvas";
import { Glass } from "@/components/ui/Glass";
import { IconButton } from "@/components/ui/Button";
import { heroSpawn, monsterSpawn, visibleViewBox } from "./helpers";
import type { PanelState } from "./usePanel";
import { MonsterForm } from "./MonsterForm";
import { HeroForm } from "./HeroForm";

/** The create form opened by + Monster or + Hero, in a glass panel below the top-right HUD cluster. */
export function CreatePanel({
  panel,
  map,
  onCreated,
}: {
  panel: PanelState;
  map: RefObject<MapHandle | null>;
  onCreated: (kind: "monster" | "hero", id: string, pos: Pos) => void;
}) {
  const { creating } = panel;
  if (!creating) return null;

  const visible = () => {
    const m = map.current;
    return m ? visibleViewBox(m.camera, m.viewportSize) : { x: -200, y: -200, width: 400, height: 400 };
  };
  const created = (id: string, pos: Pos) => {
    panel.close();
    onCreated(creating, id, pos);
  };

  return (
    <Glass as="aside" className="absolute top-18 right-4 z-40 w-80 max-w-[calc(100%-2rem)] p-4">
      <IconButton
        label="Close"
        icon="close"
        className="absolute top-2 right-2 border-transparent bg-transparent"
        onClick={panel.close}
      />
      {creating === "monster" ? (
        <MonsterForm spawnAt={() => monsterSpawn(visible())} onCreated={created} onCancel={panel.close} />
      ) : (
        <HeroForm spawnAt={() => heroSpawn(visible())} onCreated={created} onCancel={panel.close} />
      )}
    </Glass>
  );
}
