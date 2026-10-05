"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { Pos, World } from "@/lib/types";
import type { MapHandle } from "@/components/map/MapCanvas";
import { heroSpawn, monsterSpawn, visibleViewBox } from "./helpers";
import type { PanelState } from "./usePanel";
import { MonsterFacts, MonsterPanel } from "./MonsterPanel";
import { HeroPanel } from "./HeroPanel";
import { MonsterForm } from "./MonsterForm";
import { HeroForm } from "./HeroForm";
import { Glass } from "@/components/ui/Glass";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";

/** Flies the view to where a figure is drawn. `fallback` is used until the figure is on the map (e.g. just created). */
export type FlyToFigure = (kind: "monster" | "hero", id: string, fallback: Pos) => void;

/** Panel width in px. With its gap to the window edge, it covers the right edge of the map. */
export const PANEL_WIDTH = 320;
/** Screen px between the panel and the right edge of the window. */
const PANEL_GAP = 16;

/**
 * The side panel: a glass card on the right edge of the map, below the
 * top-right HUD cluster (the map keeps its size). Render it inside a
 * `relative` container that holds the map.
 */
export function SidePanel({
  panel,
  world,
  map,
  flyTo,
}: {
  panel: PanelState;
  world: World;
  map: RefObject<MapHandle | null>;
  flyTo: FlyToFigure;
}) {
  const { selection, mode } = panel;
  const isOpen = selection !== null || mode !== null;

  // Esc leaves an edit form first, then closes the panel. Other Esc handlers
  // (a drag in progress, the target popover) claim the key with preventDefault();
  // they may run after this listener, so look at the event once dispatch is over.
  const onEscape = useRef<() => void>(() => {});
  useEffect(() => {
    onEscape.current = mode?.type === "edit" ? panel.back : panel.close;
  });
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A re-render in between (e.g. a click selected something) makes this Esc stale.
      const handler = onEscape.current;
      setTimeout(() => {
        if (!e.defaultPrevented && onEscape.current === handler) handler();
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  /** The visible part of the map, not counting the area under this panel. */
  const visible = () => {
    const m = map.current;
    if (!m) return { x: -200, y: -200, width: 400, height: 400 };
    return visibleViewBox(m.camera, m.viewportSize, PANEL_WIDTH + PANEL_GAP);
  };
  const created = (kind: "monster" | "hero") => (id: string, pos: Pos) => {
    panel.select({ kind, id });
    flyTo(kind, id, pos);
  };

  let content: ReactNode = null;
  if (mode?.type === "create" && mode.kind === "monster") {
    content = (
      <MonsterForm
        spawnAt={() => monsterSpawn(visible())}
        onCreated={created("monster")}
        onCancel={panel.back}
      />
    );
  } else if (mode?.type === "create" && mode.kind === "hero") {
    content = (
      <HeroForm
        spawnAt={() => heroSpawn(visible())}
        onCreated={created("hero")}
        onCancel={panel.back}
      />
    );
  } else if (mode?.type === "trophy") {
    const monster = world.monsters.find((m) => m.id === mode.id);
    content = monster && (
      <div>
        <p className="font-display mb-2 flex items-center gap-1.5 text-xs tracking-[0.08em] text-hud-gold uppercase">
          <Icon.trophy className="size-4" />
          Trophy
        </p>
        <MonsterFacts monster={monster} />
      </div>
    );
  } else if (selection?.kind === "monster") {
    const monster = world.monsters.find((m) => m.id === selection.id);
    if (monster) {
      content =
        mode?.type === "edit" ? (
          <MonsterForm key={monster.id} monster={monster} onSaved={panel.back} onCancel={panel.back} />
        ) : (
          <MonsterPanel
            world={world}
            monster={monster}
            onEdit={panel.edit}
            onGone={panel.close}
            onSelectHero={(id) => panel.select({ kind: "hero", id })}
          />
        );
    }
  } else if (selection?.kind === "hero") {
    const hero = world.heroes.find((h) => h.id === selection.id);
    if (hero) {
      content =
        mode?.type === "edit" ? (
          <HeroForm key={hero.id} hero={hero} onSaved={panel.back} onCancel={panel.back} />
        ) : (
          <HeroPanel
            world={world}
            hero={hero}
            onEdit={panel.edit}
            onGone={panel.close}
            onFlyTo={(m) => flyTo("monster", m.id, m.pos)}
          />
        );
    }
  }

  return (
    <Glass
      as="aside"
      className="absolute top-18 bottom-4 z-40 overflow-y-auto p-4"
      style={{ right: PANEL_GAP, width: PANEL_WIDTH, maxWidth: `calc(100% - ${2 * PANEL_GAP}px)` }}
    >
      <IconButton
        label="Close panel"
        title="Close (Esc)"
        icon="close"
        className="absolute top-2 right-2 border-transparent bg-transparent"
        onClick={panel.close}
      />
      {content}
    </Glass>
  );
}
