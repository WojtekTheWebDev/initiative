"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Monster, Pos, World } from "@/lib/types";
import { fitBounds, type ViewportSize } from "@/lib/map/camera";
import { openingPoints, shownTags, type PlacedHero, type PlacedMonster, type WorldLayout } from "@/lib/map/layout";
import { depthOrder } from "@/lib/map/minis";
import { HERO_BASE_RADIUS } from "@/lib/map/rings";
import { figureFootprints } from "@/lib/map/terrain";
import { MapCanvas, type MapHandle } from "@/components/map/MapCanvas";
import { ContactShadow, FigureDefs, FigureStyles } from "@/components/map/MiniFigure";
import { MonsterFigure, MonsterLabel } from "@/components/map/MonsterFigure";
import { HeroFigure, HeroLabel } from "@/components/map/HeroFigure";
import { TargetArrows } from "@/components/map/TargetArrows";
import { unfought } from "@/lib/domain";
import { MusterTokens } from "@/components/MusterTokens";
import { EdgeArrows } from "@/components/map/EdgeArrows";
import { useFigureDrag, type FigureDrag } from "@/components/map/useFigureDrag";
import { useGlide } from "@/components/map/useGlide";
import { DragOverlay } from "@/components/map/DragOverlay";
import { MapControls } from "@/components/map/MapControls";
import { CreateButtons } from "@/components/CreateButtons";
import { FigureCard } from "@/components/card/FigureCard";
import { useSelection, type Selection } from "@/components/card/useSelection";
import { useDialogs } from "@/components/dialogs/useDialogs";
import { FigureDialogs } from "@/components/dialogs/FigureDialogs";
import { TrophyShelf } from "@/components/trophies/TrophyShelf";
import { Hud, Wordmark } from "@/components/Hud";

/** Flies the view to where a figure is drawn. `fallback` is used until the figure is on the map (e.g. just created). */
type FlyToFigure = (kind: "monster" | "hero", id: string, fallback: Pos) => void;

/** Screen px kept around the opening view, outside the figures and their name tags, so the HUD clusters don't cover them. */
const OPENING_PADDING = 88;

export function Board({ world }: { world: World }) {
  const map = useRef<MapHandle>(null);
  // Drag and drop with optimistic updates; `drag.layout` includes the live drag.
  const drag = useFigureDrag(world, map);
  // The figure whose card is open; `null` once it is slain or deleted.
  const { selection, select } = useSelection(drag.world);
  const layout = drag.layout;
  // Counted from the optimistic world, so the alarm updates the moment you drop.
  const unfoughtMonsters = useMemo(() => unfought(drag.world), [drag.world]);
  const unfoughtPlaced = useMemo(() => layout.monsters.filter((m) => m.unfought), [layout]);
  const footprints = useMemo(() => figureFootprints(layout), [layout]);

  // A figure to fly to once it shows up in the layout (see flyToFigure).
  const flyPending = useRef<{ kind: "monster" | "hero"; id: string; fallback: Pos } | null>(null);
  useEffect(() => {
    const pending = flyPending.current;
    const pos = pending && drawnPos(layout, pending.kind, pending.id);
    if (!pending || !pos) return;
    flyPending.current = null;
    if (Math.hypot(pos.x - pending.fallback.x, pos.y - pending.fallback.y) > 1) map.current?.flyTo(pos);
  }, [layout]);
  /** Figures are drawn where the layout puts them, which differs from their home when they are pulled or nudged. */
  const flyToFigure: FlyToFigure = (kind, id, fallback) => {
    const pos = drawnPos(layout, kind, id);
    flyPending.current = pos ? null : { kind, id, fallback };
    map.current?.flyTo(pos ?? fallback);
  };
  const flyTo = (m: Monster) => flyToFigure("monster", m.id, m.pos);
  // The monster and hero dialogs: `dialogs.openCreate(kind)` and `dialogs.openEdit(kind, id)`.
  const dialogs = useDialogs();

  // The opening view, worked out from the figures; "fit everything" returns to it.
  const initialCamera = (viewport: ViewportSize) =>
    fitBounds(openingPoints(layout), viewport, OPENING_PADDING);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <FigureStyles />
      <MapCanvas
        ref={map}
        initialCamera={initialCamera}
        footprints={footprints}
        onBackgroundClick={() => select(null)}
        overlay={(view) => (
          <>
            <EdgeArrows view={view} monsters={unfoughtPlaced} onPick={flyTo} />
            <FigureCard
              view={view}
              drag={drag}
              selection={selection}
              onSelect={select}
              onFlyTo={flyTo}
              onEdit={(s) => dialogs.openEdit(s.kind, s.id)}
            />
            <DragOverlay drag={drag} view={view} />
          </>
        )}
      >
        {({ camera }) => (
          <Figures drag={drag} scale={camera.scale} selection={selection} onSelect={select} />
        )}
      </MapCanvas>

      <Hud
        topLeft={
          <>
            <Wordmark />
            <MusterTokens monsters={unfoughtMonsters} onPick={flyTo} />
          </>
        }
        topRight={<CreateButtons onCreate={dialogs.openCreate} />}
        bottomCenter={<TrophyShelf world={drag.world} shelfRef={drag.shelfRef} hint={drag.shelfHint} />}
        bottomRight={
          <MapControls
            map={map}
            newMonster={() => dialogs.openCreate("monster")}
            newHero={() => dialogs.openCreate("hero")}
          />
        }
      />

      <FigureDialogs
        dialogs={dialogs}
        world={drag.world}
        map={map}
        onCreated={(kind, id, pos) => {
          select({ kind, id });
          flyToFigure(kind, id, pos);
        }}
      />
    </div>
  );
}

/** One figure on the table, in the order it is drawn. */
type Placed =
  | { kind: "monster"; key: string; pos: Pos; radius: number; placed: PlacedMonster }
  | { kind: "hero"; key: string; pos: Pos; radius: number; placed: PlacedHero };

/**
 * World-space figures. Draw order: target arrows, contact shadows, the minis
 * in depth order (nearer minis overlap farther ones, the dragged figure on
 * top), then the name tags that fit (see `shownTags`), so no mini hides a name.
 */
function Figures(props: {
  drag: FigureDrag;
  scale: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const { drag, scale, selection, onSelect } = props;
  // Figures glide to a new layout; during a drag the dragged one follows the cursor exactly and the rest ease after it.
  const layout = useGlide(drag.layout, drag.lifted);
  const isSelected = (kind: "monster" | "hero", id: string) =>
    selection?.kind === kind && selection.id === id;
  const lifted = drag.lifted && `${drag.lifted.kind}:${drag.lifted.id}`;
  const figures = depthOrder<Placed>(
    [
      ...layout.monsters.map((m) => ({
        kind: "monster" as const,
        key: `monster:${m.monster.id}`,
        pos: m.pos,
        radius: m.radius,
        placed: m,
      })),
      ...layout.heroes.map((h) => ({
        kind: "hero" as const,
        key: `hero:${h.hero.id}`,
        pos: h.pos,
        radius: HERO_BASE_RADIUS,
        placed: h,
      })),
    ],
    (f) => f.pos,
    (f) => f.key,
    lifted,
  );
  // Tags that would cover each other when zoomed out are left out; the selected figure always keeps its own.
  const focus = lifted || (selection && `${selection.kind}:${selection.id}`);
  const tags = useMemo(() => shownTags(layout, scale, focus || null), [layout, scale, focus]);
  return (
    <>
      <FigureDefs />
      <TargetArrows layout={layout} scale={scale} focus={selection} bindLink={drag.bindLink} />
      <g aria-hidden="true" style={{ pointerEvents: "none" }}>
        {figures.map((f) => (
          <ContactShadow key={f.key} pos={f.pos} radius={f.radius} />
        ))}
      </g>
      <g>
        {figures.map((f) =>
          f.kind === "monster" ? (
            <MonsterFigure
              key={f.key}
              placed={f.placed}
              scale={scale}
              selected={isSelected("monster", f.placed.monster.id)}
              dropHint={drag.dropHint(f.placed.monster.id)}
              {...drag.bindFigure("monster", f.placed.monster.id, () =>
                onSelect({ kind: "monster", id: f.placed.monster.id }),
              )}
            />
          ) : (
            <HeroFigure
              key={f.key}
              placed={f.placed}
              scale={scale}
              selected={isSelected("hero", f.placed.hero.id)}
              {...drag.bindFigure("hero", f.placed.hero.id, () => onSelect({ kind: "hero", id: f.placed.hero.id }))}
            />
          ),
        )}
      </g>
      <g>
        {figures.filter((f) => tags.has(f.key)).map((f) =>
          f.kind === "monster" ? (
            <MonsterLabel key={f.key} placed={f.placed} scale={scale} />
          ) : (
            <HeroLabel key={f.key} placed={f.placed} scale={scale} />
          ),
        )}
      </g>
    </>
  );
}

function drawnPos(layout: WorldLayout, kind: "monster" | "hero", id: string): Pos | undefined {
  return kind === "monster"
    ? layout.monsters.find((m) => m.monster.id === id)?.pos
    : layout.heroes.find((h) => h.hero.id === id)?.pos;
}
