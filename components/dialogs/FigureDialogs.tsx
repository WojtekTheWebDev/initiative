"use client";

import type { RefObject } from "react";
import type { Pos, World } from "@/lib/types";
import type { MapHandle } from "@/components/map/MapCanvas";
import { MonsterDialog } from "./MonsterDialog";
import { HeroDialog } from "./HeroDialog";
import { spawnPos } from "./helpers";
import type { Dialogs, FigureKind } from "./useDialogs";

/**
 * Renders whichever dialog `dialogs` has open. A new figure stands at the
 * centre of the visible map; `onCreated` hears about it once it is saved.
 * An edit dialog whose figure is gone (slain or deleted) shows nothing.
 */
export function FigureDialogs({
  dialogs,
  world,
  map,
  onCreated,
}: {
  dialogs: Dialogs;
  world: World;
  map: RefObject<MapHandle | null>;
  onCreated: (kind: FigureKind, id: string, pos: Pos) => void;
}) {
  const { open, close } = dialogs;
  if (!open) return null;

  const spawnAt = () => {
    const m = map.current;
    return m ? spawnPos(m.camera, m.viewportSize) : { x: 0, y: 0 };
  };
  const key = `${open.kind}:${open.id ?? "new"}`;

  if (open.kind === "monster") {
    const monster =
      open.id === undefined ? undefined : world.monsters.find((m) => m.id === open.id && !m.slain);
    if (open.id !== undefined && !monster) return null;
    return (
      <MonsterDialog
        key={key}
        monster={monster}
        spawnAt={spawnAt}
        onCreated={(id, pos) => onCreated("monster", id, pos)}
        onClose={close}
      />
    );
  }

  const hero = open.id === undefined ? undefined : world.heroes.find((h) => h.id === open.id);
  if (open.id !== undefined && !hero) return null;
  return (
    <HeroDialog
      key={key}
      hero={hero}
      spawnAt={spawnAt}
      onCreated={(id, pos) => onCreated("hero", id, pos)}
      onClose={close}
    />
  );
}
