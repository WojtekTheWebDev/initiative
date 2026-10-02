"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { World } from "@/lib/types";
import type { MapHandle } from "@/components/map/MapCanvas";
import { heroSpawn, monsterSpawn, visibleViewBox } from "./helpers";
import type { PanelState } from "./usePanel";
import { MonsterFacts, MonsterPanel } from "./MonsterPanel";
import { HeroPanel } from "./HeroPanel";
import { MonsterForm } from "./MonsterForm";
import { HeroForm } from "./HeroForm";

/** Panel width in px (Tailwind w-80). It covers the right edge of the map. */
export const PANEL_WIDTH = 320;

/**
 * The side panel, drawn over the right edge of the map (the map keeps its size).
 * Render it inside a `relative` container that holds the map.
 */
export function SidePanel({
  panel,
  world,
  map,
}: {
  panel: PanelState;
  world: World;
  map: RefObject<MapHandle | null>;
}) {
  const { selection, mode } = panel;
  const isOpen = selection !== null || mode !== null;

  // Esc leaves an edit form first, then closes the panel. Other Esc handlers
  // (a drag in progress, the ghost popover) claim the key with preventDefault();
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
    return visibleViewBox(m.camera, m.viewportSize, PANEL_WIDTH);
  };
  const created = (kind: "monster" | "hero") => (id: string, pos: { x: number; y: number }) => {
    panel.select({ kind, id });
    map.current?.flyTo(pos);
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">🏆 Trophy</p>
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
            onFlyTo={(m) => map.current?.flyTo(m.pos)}
          />
        );
    }
  }

  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 overflow-y-auto border-l border-foreground/10 bg-background/95 p-4 shadow-xl backdrop-blur-sm"
      style={{ width: PANEL_WIDTH, maxWidth: "100%" }}
    >
      <button
        type="button"
        aria-label="Close panel"
        title="Close (Esc)"
        className="absolute top-2 right-2 rounded px-2 py-1 text-sm opacity-60 hover:bg-foreground/10 hover:opacity-100"
        onClick={panel.close}
      >
        ✕
      </button>
      {content}
    </aside>
  );
}
