"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import type { Monster, World } from "@/lib/types";
import { fitBounds, type ViewportSize } from "@/lib/map/camera";
import { openingPoints, type WorldLayout } from "@/lib/map/layout";
import { MapCanvas, type MapHandle } from "@/components/map/MapCanvas";
import { FigureStyles, MonsterFigure } from "@/components/map/MonsterFigure";
import { HeroFigure } from "@/components/map/HeroFigure";
import { TargetArrows } from "@/components/map/TargetArrows";
import { unfought } from "@/lib/domain";
import { UnfoughtAlarm } from "@/components/UnfoughtAlarm";
import { EdgeArrows } from "@/components/map/EdgeArrows";
import { useFigureDrag, type FigureDrag } from "@/components/map/useFigureDrag";
import { DragOverlay } from "@/components/map/DragOverlay";
import { SidePanel } from "@/components/panel/SidePanel";
import { CreateButtons } from "@/components/panel/CreateButtons";
import { usePanel } from "@/components/panel/usePanel";
import { Trophies } from "@/components/Trophies";

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
  // Counted from the optimistic world, so the alarm updates the moment you drop.
  const unfoughtMonsters = useMemo(() => unfought(drag.world), [drag.world]);
  const flyTo = (m: Monster) => map.current?.flyTo(m.pos);
  // T8: side panel / forms state; `panel.selection` is null once the item is slain or deleted.
  const panel = usePanel(drag.world, selection, setSelection);

  // Only the first call matters: MapCanvas computes the opening camera once.
  const initialCamera = (viewport: ViewportSize) =>
    fitBounds(openingPoints(layout), viewport, OPENING_PADDING);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FigureStyles />
      <Header>
        <UnfoughtAlarm monsters={unfoughtMonsters} onPick={flyTo} />
        <CreateButtons panel={panel} />
      </Header>

      <div className="relative flex min-h-0 flex-1">
        <MapCanvas
          ref={map}
          initialCamera={initialCamera}
          onBackgroundClick={() => setSelection(null)}
          overlay={(view) => (
            <>
              <EdgeArrows view={view} monsters={unfoughtMonsters} onPick={flyTo} />
              <DragOverlay drag={drag} view={view} />
            </>
          )}
        >
          {({ camera }) => (
            <Figures
              drag={drag}
              scale={camera.scale}
              selection={panel.selection}
              onSelect={setSelection}
            />
          )}
        </MapCanvas>

        {/* T8: side panel, an overlay on the right edge of the map */}
        <SidePanel panel={panel} world={drag.world} map={map} />
      </div>

      <Trophies monsters={drag.world.monsters} openId={panel.trophyId} onOpen={panel.openTrophy} />
    </div>
  );
}

/** World-space figures. Draw order: target arrows, heroes, monsters (so monster labels sit on top). */
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
      <TargetArrows layout={layout} scale={scale} focus={selection} bindLink={drag.bindLink} />
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
