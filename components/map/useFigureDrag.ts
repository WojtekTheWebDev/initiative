"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import type { Pos, World } from "@/lib/types";
import { territoryOf } from "@/lib/domain";
import { layoutWorld, type WorldLayout } from "@/lib/map/layout";
import * as actions from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import type { MapHandle } from "./MapCanvas";
import type { FigureHandlers } from "./MonsterFigure";
import {
  applyOp,
  layoutWithDrag,
  pastThreshold,
  resolveHeroDrop,
  worldWithDrag,
  type LiveDrag,
  type WorldOp,
} from "./drag";

/** How a monster is highlighted while a hero is dragged over it. */
export type DropHint = "assign" | "ghost";

export type GhostRef = { heroId: string; monsterId: string };

type Live = {
  drag: LiveDrag;
  /** Hero drags: the monster under the cursor and what dropping there would do. */
  hint: { monsterId: string; kind: DropHint } | null;
  /** Monster drags: the monster is now on the other side of x = 0 than where it started. */
  crossed: boolean;
};

/** One pointer press on a figure, from pointerdown until pointerup. */
type Session = {
  kind: "monster" | "hero";
  id: string;
  pointerId: number;
  startClient: Pos;
  /** World point under the pointer at the press. */
  startWorld: Pos;
  /** The figure's position at the press. */
  origin: Pos;
  /** World and layout at the press (for hit-testing and no-op checks). */
  world: World;
  layout: WorldLayout;
  moved: boolean;
  shift: boolean;
  cursor: Pos;
  pos: Pos;
  end: () => void;
};

export type FigureDrag = ReturnType<typeof useFigureDrag>;

/**
 * Drag, drop and ghost interactions for the Board (T6).
 *
 * - Press a monster or hero and move more than DRAG_THRESHOLD px to drag it;
 *   a shorter press is a click (selection). Clicks after a drag are swallowed.
 * - While dragging, the figure follows the pointer: a monster moves in the world
 *   before layout (its heroes and ghosts follow), a hero is drawn at the cursor.
 * - On drop, the change is applied optimistically with the same lib/domain rule
 *   the server uses, then the Server Action runs. The optimistic world stays
 *   until the refreshed server data arrives (no snap-back); on failure it reverts
 *   and `error` is set.
 */
export function useFigureDrag(world: World, map: RefObject<MapHandle | null>) {
  const [optimisticWorld, addOp] = useOptimistic(world, applyOp);
  const [live, setLive] = useState<Live | null>(null);
  const [ghost, setGhost] = useState<GhostRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Session | null>(null);
  const suppressClick = useRef(false);

  const drag = live?.drag ?? null;
  const shownWorld = useMemo(() => worldWithDrag(optimisticWorld, drag), [optimisticWorld, drag]);
  const baseLayout = useMemo(() => layoutWorld(shownWorld), [shownWorld]);
  const layout = useMemo(() => layoutWithDrag(baseLayout, drag), [baseLayout, drag]);

  // Stop listening if the Board unmounts mid-drag.
  useEffect(() => () => session.current?.end(), []);

  const run = useCallback(
    (op: WorldOp) => {
      setError(null);
      startTransition(async () => {
        addOp(op);
        try {
          await callServer(op);
        } catch (err) {
          setError(err instanceof Error && err.message ? err.message : "Could not save the change");
        }
      });
    },
    [addOp],
  );

  function showLive(s: Session) {
    let hint: Live["hint"] = null;
    if (s.kind === "hero") {
      const drop = resolveHeroDrop(s.world, s.layout.monsters, s.id, s.cursor, s.pos, s.shift);
      if (drop && "monsterId" in drop) {
        hint = { monsterId: drop.monsterId, kind: drop.shift ? "ghost" : "assign" };
      }
    }
    const crossed = s.kind === "monster" && territoryOf(s.pos) !== territoryOf(s.origin);
    setLive({ drag: { kind: s.kind, id: s.id, pos: s.pos }, hint, crossed });
  }

  function track(s: Session, clientX: number, clientY: number) {
    const handle = map.current;
    if (!handle) return;
    s.cursor = handle.clientToWorld(clientX, clientY);
    s.pos = {
      x: s.origin.x + (s.cursor.x - s.startWorld.x),
      y: s.origin.y + (s.cursor.y - s.startWorld.y),
    };
  }

  function finish(s: Session, e: globalThis.PointerEvent | null) {
    s.end();
    if (!s.moved) return; // a click: let onClick select
    suppressClick.current = true;
    setLive(null);
    if (!e) return; // cancelled
    track(s, e.clientX, e.clientY);
    if (s.kind === "monster") {
      run({ kind: "moveMonster", id: s.id, pos: round(s.pos) });
      return;
    }
    const drop = resolveHeroDrop(s.world, s.layout.monsters, s.id, s.cursor, round(s.pos), e.shiftKey);
    if (drop) run({ kind: "dropHero", heroId: s.id, drop });
  }

  function start(kind: "monster" | "hero", id: string, e: PointerEvent<SVGGElement>) {
    if (e.button !== 0 || session.current) return;
    // Keep the canvas from panning; it also skips [data-figure] targets.
    e.stopPropagation();
    suppressClick.current = false;
    const handle = map.current;
    const origin =
      kind === "monster"
        ? layout.monsters.find((m) => m.monster.id === id)?.pos
        : layout.heroes.find((h) => h.hero.id === id)?.pos;
    if (!handle || !origin) return;

    const el = e.currentTarget;
    const pointerId = e.pointerId;
    try {
      el.setPointerCapture(pointerId);
    } catch {
      // Capture is best-effort; window listeners below still see the events.
    }
    const startWorld = handle.clientToWorld(e.clientX, e.clientY);

    const onMove = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!s.moved) {
        if (!pastThreshold(s.startClient, { x: ev.clientX, y: ev.clientY })) return;
        s.moved = true;
        setGhost(null);
      }
      s.shift = ev.shiftKey;
      track(s, ev.clientX, ev.clientY);
      showLive(s);
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === pointerId) finish(s, ev);
    };
    const onCancel = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === pointerId) finish(s, null);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault(); // tells the side panel this Esc is taken
        finish(s, null);
        return;
      }
      if (ev.key === "Shift" && s.moved && s.shift !== (ev.type === "keydown")) {
        s.shift = ev.type === "keydown";
        showLive(s);
      }
    };

    const s: Session = {
      kind,
      id,
      pointerId,
      startClient: { x: e.clientX, y: e.clientY },
      startWorld,
      origin,
      world: optimisticWorld,
      layout,
      moved: false,
      shift: e.shiftKey,
      cursor: startWorld,
      pos: origin,
      end: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
        if (session.current === s) session.current = null;
      },
    };
    session.current = s;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
  }

  /** Swallows the click that the browser fires after a drag. */
  function guardClick(e: MouseEvent<SVGGElement>): boolean {
    e.stopPropagation();
    if (suppressClick.current) {
      suppressClick.current = false;
      return false;
    }
    return true;
  }

  /** Handlers for a draggable monster or hero. `onClick` runs only for a press without a drag. */
  function bindFigure(kind: "monster" | "hero", id: string, onClick: () => void): FigureHandlers {
    return {
      onPointerDown: (e) => start(kind, id, e),
      onClick: (e) => {
        if (guardClick(e)) onClick();
      },
    };
  }

  /** Handlers for a ghost marker: a click opens its popover. */
  function bindGhost(heroId: string, monsterId: string): FigureHandlers {
    return {
      onPointerDown: (e) => {
        e.stopPropagation();
        suppressClick.current = false;
      },
      onClick: (e) => {
        if (guardClick(e)) setGhost({ heroId, monsterId });
      },
    };
  }

  return {
    /** The world with pending (optimistic) changes, without the live drag. */
    world: optimisticWorld,
    /** Layout to draw: optimistic changes plus the figure being dragged. */
    layout,
    bindFigure,
    bindGhost,
    /** Highlight for a monster while a hero is dragged over it. */
    dropHint: (monsterId: string): DropHint | null =>
      live?.hint?.monsterId === monsterId ? live.hint.kind : null,
    /** The hero being dragged, to draw on top of everything. */
    liftedHeroId: drag?.kind === "hero" ? drag.id : null,
    /** A dragged monster has crossed x = 0. */
    crossing: live?.crossed ?? false,
    ghost,
    closeGhost: () => setGhost(null),
    makeMain: (g: GhostRef) => {
      setGhost(null);
      run({ kind: "makeMain", heroId: g.heroId, monsterId: g.monsterId });
    },
    removeTarget: (g: GhostRef) => {
      setGhost(null);
      run({ kind: "removeTarget", heroId: g.heroId, monsterId: g.monsterId });
    },
    error,
    dismissError: () => setError(null),
  };
}

function round(p: Pos): Pos {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

function callServer(op: WorldOp): Promise<void> {
  switch (op.kind) {
    case "moveMonster":
      return unwrap(actions.moveMonster(op.id, op.pos));
    case "dropHero":
      return unwrap(actions.dropHero(op.heroId, op.drop));
    case "makeMain":
      return unwrap(actions.makeMain(op.heroId, op.monsterId));
    case "removeTarget":
      return unwrap(actions.removeTarget(op.heroId, op.monsterId));
  }
}
