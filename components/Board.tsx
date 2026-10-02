"use client";

import { useRef, useState, type ReactNode } from "react";
import type { World } from "@/lib/types";
import { fitBounds, type ViewportSize } from "@/lib/map/camera";
import { openingPoints, type WorldLayout } from "@/lib/map/layout";
import { MapCanvas, type MapHandle } from "@/components/map/MapCanvas";
import { FigureStyles, MonsterFigure } from "@/components/map/MonsterFigure";
import { HeroFigure } from "@/components/map/HeroFigure";
import { GhostMarker } from "@/components/map/GhostMarker";
import { useFigureDrag, type FigureDrag } from "@/components/map/useFigureDrag";
import { DragOverlay } from "@/components/map/DragOverlay";

export type Selection = { kind: "monster" | "hero"; id: string } | null;

/** Screen px kept around the opening view, so bases and labels at the edge stay visible. */
const OPENING_PADDING = 110;

export function Board({ world }: { world: World }) {
  // Shared UI state. T6-T8 hook into these.
  const map = useRef<MapHandle>(null);
  const [selection, setSelection] = useState<Selection>(null);
  // T6: drag/drop with optimistic updates; `drag.layout` includes the live drag.
  const drag = useFigureDrag(world, map);
  const layout = drag.layout;

  // Only the first call matters: MapCanvas computes the opening camera once.
  const initialCamera = (viewport: ViewportSize) =>
    fitBounds(openingPoints(layout), viewport, OPENING_PADDING);

  const selectedName = selectionName(world, selection);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FigureStyles />
      <Header>
        {/* T7: header alarm (unfought counter) */}
        {/* T8: "+ Monster" / "+ Hero" buttons */}
      </Header>

      <div className="flex min-h-0 flex-1">
        <MapCanvas
          ref={map}
          initialCamera={initialCamera}
          onBackgroundClick={() => setSelection(null)}
          overlay={(view) => (
            <>
              {/* T7: <EdgeArrows ... /> */}
              <DragOverlay drag={drag} view={view} />
            </>
          )}
        >
          {({ camera }) => (
            <Figures
              drag={drag}
              scale={camera.scale}
              selection={selection}
              onSelect={setSelection}
            />
          )}
        </MapCanvas>

        {/* T8: replace with the real side panel */}
        {selection && selectedName !== null && (
          <SidePanel onClose={() => setSelection(null)}>
            <p className="text-xs uppercase tracking-wide opacity-60">{selection.kind}</p>
            <h2 className="text-lg font-semibold">{selectedName}</h2>
          </SidePanel>
        )}
      </div>

      {/* T8: trophies strip */}
      <TrophiesPlaceholder count={world.monsters.filter((m) => m.slain).length} />
    </div>
  );
}

function selectionName(world: World, selection: Selection): string | null {
  if (!selection) return null;
  const list = selection.kind === "monster" ? world.monsters : world.heroes;
  const item = list.find((x) => x.id === selection.id);
  if (!item || ("slain" in item && item.slain)) return null;
  return item.name;
}

/** World-space figures. Draw order: ghosts, heroes, monsters (so monster labels sit on top). */
function Figures(props: {
  drag: FigureDrag;
  scale: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const { drag, scale, selection, onSelect } = props;
  const { layout, liftedHeroId } = drag;
  const isSelected = (kind: "monster" | "hero", id: string) =>
    selection?.kind === kind && selection.id === id;
  const hero = (h: WorldLayout["heroes"][number]) => (
    <HeroFigure
      key={h.hero.id}
      placed={h}
      scale={scale}
      selected={isSelected("hero", h.hero.id)}
      {...drag.bindFigure("hero", h.hero.id, () => onSelect({ kind: "hero", id: h.hero.id }))}
    />
  );
  return (
    <>
      <g>
        {layout.ghosts.map((g) => (
          <GhostMarker
            key={`${g.hero.id}:${g.monsterId}`}
            placed={g}
            scale={scale}
            {...drag.bindGhost(g.hero.id, g.monsterId)}
          />
        ))}
      </g>
      <g>
        {layout.heroes.filter((h) => h.hero.id !== liftedHeroId).map(hero)}
      </g>
      <g>
        {layout.monsters.map((m) => (
          <MonsterFigure
            key={m.monster.id}
            placed={m}
            scale={scale}
            selected={isSelected("monster", m.monster.id)}
            dropHint={drag.dropHint(m.monster.id)}
            {...drag.bindFigure("monster", m.monster.id, () => onSelect({ kind: "monster", id: m.monster.id }))}
          />
        ))}
      </g>
      {/* The hero being dragged goes on top of everything. */}
      <g>{layout.heroes.filter((h) => h.hero.id === liftedHeroId).map(hero)}</g>
    </>
  );
}

function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-foreground/10 px-4">
      <h1 className="text-base font-semibold tracking-tight">⚔️ Initiative</h1>
      <div className="flex flex-1 items-center justify-end gap-2">{children}</div>
    </header>
  );
}

function SidePanel({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <aside className="relative w-80 shrink-0 overflow-y-auto border-l border-foreground/10 bg-background p-4">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute top-2 right-2 rounded px-2 py-1 text-sm opacity-60 hover:bg-foreground/10 hover:opacity-100"
        onClick={onClose}
      >
        ✕
      </button>
      {children}
    </aside>
  );
}

function TrophiesPlaceholder({ count }: { count: number }) {
  return (
    <footer className="flex h-9 shrink-0 items-center border-t border-foreground/10 px-4 text-sm opacity-70">
      🏆 {count} slain
    </footer>
  );
}
