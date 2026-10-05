"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Monster } from "@/lib/types";
import { worldToScreen } from "@/lib/map/camera";
import { HERO_BASE_RADIUS } from "@/lib/map/rings";
import type { MapView } from "@/components/map/MapCanvas";
import type { FigureDrag } from "@/components/map/useFigureDrag";
import { useGlide } from "@/components/map/useGlide";
import { Glass } from "@/components/ui/Glass";
import { placeCard, type CardSize } from "./placeCard";
import type { Selection } from "./useSelection";
import { MonsterCard } from "./MonsterCard";
import { HeroCard } from "./HeroCard";

/** Card width in screen px (narrower when the window is). */
const CARD_WIDTH = 288;
/** The pointer's size in screen px: how far it reaches out of the card, and its height. */
const POINTER_REACH = 10;
const POINTER_HEIGHT = 18;

type Props = {
  view: MapView;
  drag: FigureDrag;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onFlyTo: (monster: Monster) => void;
  /** Opens the edit dialog for the selected figure; without it the cards have no Edit button. */
  onEdit?: (selection: NonNullable<Selection>) => void;
};

/**
 * The selected figure's card, for MapCanvas' screen-space overlay. It is placed
 * by `placeCard` next to where the figure is drawn, using the same glide as the
 * figures, so it stays attached while the view pans or zooms and while figures
 * glide to a new layout. It hides while any figure is dragged, and while its
 * figure's base is out of view.
 *
 * Esc closes it, unless something else claimed that Esc first with
 * `preventDefault()` (a drag, the arrow buttons, a dialog, the card's own menu).
 */
export function FigureCard({ view, drag, selection, onSelect, onFlyTo, onEdit }: Props) {
  // Always follows the layout, even with nothing selected, so a card opened mid-glide starts where its figure is drawn.
  const layout = useGlide(drag.layout, drag.lifted);
  const hidden = drag.lifted !== null;
  const key = selection && `${selection.kind}:${selection.id}`;

  const onSelectRef = useRef(onSelect);
  const keyRef = useRef(key);
  useEffect(() => {
    onSelectRef.current = onSelect;
    keyRef.current = key;
  });
  useEffect(() => {
    if (!key || hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Other handlers may run after this one, so look once dispatch is over;
      // a selection changed in between makes this Esc stale.
      setTimeout(() => {
        if (!e.defaultPrevented && keyRef.current === key) onSelectRef.current(null);
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, hidden]);

  if (!selection || hidden) return null;
  const close = () => onSelect(null);

  if (selection.kind === "monster") {
    const placed = layout.monsters.find((m) => m.monster.id === selection.id);
    if (!placed) return null;
    return (
      <CardFrame
        key={key}
        view={view}
        pos={placed.pos}
        radius={placed.radius}
        label={placed.monster.name}
        figure={`[data-figure][data-monster="${CSS.escape(selection.id)}"]`}
      >
        <MonsterCard
          world={drag.world}
          monster={placed.monster}
          onSelectHero={(id) => onSelect({ kind: "hero", id })}
          onClose={close}
          onSlay={() => drag.slay(placed.monster.id)}
          onEdit={onEdit && (() => onEdit(selection))}
        />
      </CardFrame>
    );
  }
  const placed = layout.heroes.find((h) => h.hero.id === selection.id);
  if (!placed) return null;
  return (
    <CardFrame
      key={key}
      view={view}
      pos={placed.pos}
      radius={HERO_BASE_RADIUS}
      label={placed.hero.name}
      figure={`[data-figure][data-hero="${CSS.escape(selection.id)}"]`}
    >
      <HeroCard
        world={drag.world}
        hero={placed.hero}
        onFlyTo={onFlyTo}
        onClose={close}
        onEdit={onEdit && (() => onEdit(selection))}
      />
    </CardFrame>
  );
}

/**
 * The glass card and its pointer, placed beside a figure's base (`pos`, world
 * units, and its `radius`). Opened from the keyboard (a figure has visible
 * focus), it takes the focus; closed while it holds the focus, it hands it
 * back to its figure (`figure`, a selector for the figure's element).
 */
function CardFrame({
  view,
  pos,
  radius,
  label,
  figure,
  children,
}: {
  view: MapView;
  pos: { x: number; y: number };
  radius: number;
  label: string;
  figure: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState<CardSize | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let holdsFocus = false;
    const onFocusIn = () => (holdsFocus = true);
    // Focus moved to another control; a press on the bare table (no new target) keeps it ours.
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget instanceof Node && !el.contains(e.relatedTarget)) holdsFocus = false;
    };
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    holdsFocus = el.contains(document.activeElement);
    return () => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      const lost = document.activeElement === document.body || document.activeElement === null;
      if (holdsFocus && lost) document.querySelector<SVGElement>(figure)?.focus();
    };
  }, [figure]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ width: el.offsetWidth, height: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { camera, viewport } = view;
  const base = worldToScreen(camera, pos);
  const place = size && placeCard({ ...base, reach: radius * camera.scale }, size, viewport);
  // A card whose figure is panned out of view would point at nothing, so it waits, hidden, until it is back.
  const inView = base.x >= 0 && base.y >= 0 && base.x <= viewport.width && base.y <= viewport.height;

  // Read while rendering, before anything moves the focus. The card stays
  // hidden until it is measured and placed, so it takes the focus then.
  const [takeFocus] = useState(() => Boolean(document.activeElement?.matches("[data-figure]:focus-visible")));
  const placed = place !== null && inView;
  const tookFocus = useRef(false);
  useEffect(() => {
    if (!takeFocus || !placed || tookFocus.current) return;
    tookFocus.current = true;
    ref.current?.querySelector("button")?.focus();
  }, [takeFocus, placed]);

  return (
    <Glass
      as="section"
      ref={ref}
      aria-label={label}
      className="pointer-events-auto absolute top-0 left-0 p-3.5 text-hud-fg motion-safe:animate-hud-fade"
      style={{
        width: CARD_WIDTH,
        maxWidth: "calc(100% - 24px)",
        transform: place ? `translate(${place.left}px, ${place.top}px)` : undefined,
        visibility: place && inView ? undefined : "hidden",
      }}
    >
      {children}
      {place && <Pointer side={place.side} y={place.pointerY} />}
    </Glass>
  );
}

/** The small glass triangle on the card's edge that points at the figure's base. */
function Pointer({ side, y }: { side: "right" | "left"; y: number }) {
  const h = POINTER_HEIGHT / 2;
  return (
    <svg
      aria-hidden="true"
      width={POINTER_REACH}
      height={POINTER_HEIGHT}
      viewBox={`0 ${-h} ${POINTER_REACH} ${POINTER_HEIGHT}`}
      className="pointer-events-none absolute overflow-visible"
      style={{
        top: y - h,
        // Overlaps the card's 1px hairline, so the triangle joins the card.
        [side === "right" ? "left" : "right"]: -POINTER_REACH,
        transform: side === "right" ? undefined : "scaleX(-1)",
      }}
    >
      <path d={`M ${POINTER_REACH + 1} ${-h} L 0 0 L ${POINTER_REACH + 1} ${h}`} fill="var(--hud-glass)" stroke="var(--hud-line)" />
    </svg>
  );
}
