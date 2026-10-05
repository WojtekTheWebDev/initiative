"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Pos, World } from "@/lib/types";
import type { FigureKind } from "@/components/dialogs/useDialogs";
import type { PanelState } from "./usePanel";
import { MonsterFacts, MonsterPanel } from "./MonsterPanel";
import { HeroPanel } from "./HeroPanel";
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
  flyTo,
  onEdit,
}: {
  panel: PanelState;
  world: World;
  flyTo: FlyToFigure;
  /** Opens the edit dialog for a figure. */
  onEdit: (kind: FigureKind, id: string) => void;
}) {
  const { selection, mode } = panel;
  const isOpen = selection !== null || mode !== null;

  // Esc closes the panel. Other Esc handlers (a drag in progress, the target
  // popover, a dialog) claim the key with preventDefault(); they may run after
  // this listener, so look at the event once dispatch is over.
  const onEscape = useRef<() => void>(() => {});
  useEffect(() => {
    onEscape.current = panel.close;
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

  let content: ReactNode = null;
  if (mode?.type === "trophy") {
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
      content = (
        <MonsterPanel
          world={world}
          monster={monster}
          onEdit={() => onEdit("monster", monster.id)}
          onGone={panel.close}
          onSelectHero={(id) => panel.select({ kind: "hero", id })}
        />
      );
    }
  } else if (selection?.kind === "hero") {
    const hero = world.heroes.find((h) => h.id === selection.id);
    if (hero) {
      content = (
        <HeroPanel
          world={world}
          hero={hero}
          onEdit={() => onEdit("hero", hero.id)}
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
