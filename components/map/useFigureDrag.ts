"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import type { Pos, World } from "@/lib/types";
import * as domain from "@/lib/domain";
import type { HeroBefore } from "@/lib/domain";
import { layoutWorld, type WorldLayout } from "@/lib/map/layout";
import { useToast } from "@/components/ui/Toast";
import { useGame, useGameUpdate } from "@/components/game/GameProvider";
import type { MapHandle } from "./MapCanvas";
import type { FigureHandlers } from "./MiniFigure";
import {
  applyOp,
  dropAction,
  heroHomeAfterDrag,
  homeAfterDrag,
  layoutWithDrag,
  pastThreshold,
  resolveHeroDrop,
  type LiveDrag,
  type ScreenRect,
  type WorldOp,
} from "./drag";

/** How a monster is highlighted while a hero is dragged over it. */
export type DropHint = "assign" | "secondary";

/** The trophy shelf during a monster drag: it glows, and brighter while the monster is over it. */
export type ShelfHint = "armed" | "over";

/** A target arrow: a hero and one of its targets. */
export type TargetRef = { heroId: string; monsterId: string };

type Live = {
  drag: LiveDrag;
  /** The layout to draw this frame (see layoutWithDrag). */
  layout: WorldLayout;
  /** Hero drags: the monster under the cursor and what dropping there would do. */
  hint: { monsterId: string; kind: DropHint } | null;
  /** Monster drags: letting go now would slay it on the trophy shelf. */
  overShelf: boolean;
};

/** One pointer press on a figure, from pointerdown until pointerup. */
type Session = {
  kind: "monster" | "hero";
  id: string;
  pointerId: number;
  startClient: Pos;
  /** World point under the pointer at the press. */
  startWorld: Pos;
  /** Where the figure was drawn at the press. */
  origin: Pos;
  /** World and layout at the press (for hit-testing and no-op checks). */
  world: World;
  layout: WorldLayout;
  moved: boolean;
  shift: boolean;
  cursor: Pos;
  /** The pointer in client px. */
  client: Pos;
  pos: Pos;
  /** The pointer is over the visible map (not over a HUD surface). */
  onMap: boolean;
  /** The layout drawn for the last pointer move: the next one starts from it. */
  frame: WorldLayout;
  end: () => void;
};

export type FigureDrag = ReturnType<typeof useFigureDrag>;

/**
 * Drag, drop and target-arrow interactions for the Board.
 *
 * - Press a monster or hero and move more than DRAG_THRESHOLD px to drag it;
 *   a shorter press is a click (selection). Clicks after a drag are swallowed.
 * - While dragging, the figure follows the pointer: a monster is pinned under
 *   it and the map re-lays out around it on every move (its cluster follows),
 *   while a hero moves alone. Arrows come from the layout, so they follow
 *   either way.
 * - Clicking an arrow opens its buttons (`link`, see TargetButtons).
 * - On drop, a dragged monster's home, or an idle hero's, moves by the drag
 *   offset (see homeAfterDrag). A monster dropped on the trophy shelf
 *   (`shelfRef`) is slain instead (see dropAction and `slay`). The change is
 *   applied to the game in this browser with a lib/domain rule (see
 *   applyOp); a change the rules refuse leaves the table as it was and an
 *   error toast says so.
 */
export function useFigureDrag(map: RefObject<MapHandle | null>) {
  const world = useGame().game.world;
  const update = useGameUpdate();
  const [live, setLive] = useState<Live | null>(null);
  const [link, setLink] = useState<TargetRef | null>(null);
  const toast = useToast();
  const session = useRef<Session | null>(null);
  const shelfRef = useRef<HTMLElement | null>(null);
  // What each slay in this session changed, so a revive can give the fighters back.
  const slainBefore = useRef(new Map<string, HeroBefore[]>());
  const suppressClick = useRef(false);

  const drag = live?.drag ?? null;
  const baseLayout = useMemo(() => layoutWorld(world), [world]);
  const layout = live?.layout ?? baseLayout;

  // Stop listening if the Board unmounts mid-drag.
  useEffect(() => () => session.current?.end(), []);

  const run = useCallback((op: WorldOp) => update(OP_WHAT[op.kind], (w) => applyOp(w, op)), [update]);

  /**
   * Revives a slain monster. If it was slain since the page was loaded,
   * its fighters get their targets back (see `revive` in lib/domain); otherwise
   * only the monster returns.
   */
  const revive = useCallback(
    (id: string) => {
      const before = slainBefore.current.get(id) ?? [];
      slainBefore.current.delete(id);
      run({ kind: "revive", id, before });
    },
    [run],
  );

  /**
   * Slays a monster, then shows the slay toast with Undo, which revives it
   * with what the slay changed for each hero.
   */
  const slay = useCallback(
    (id: string) => {
      const name = world.monsters.find((m) => m.id === id)?.name ?? "Monster";
      let before: HeroBefore[] = [];
      const next = update(`slay ${name}`, (w) => {
        const slain = domain.slay(w, id, domain.localToday());
        before = domain.heroesChanged(w, slain);
        return slain;
      });
      if (!next) return;
      slainBefore.current.set(id, before);
      toast.show({
        tone: "slain",
        message: `${name} slain`,
        action: { label: "Undo", icon: "undo", run: () => revive(id) },
      });
    },
    [world, update, toast, revive],
  );

  const shelfRect = (): ScreenRect | null => shelfRef.current?.getBoundingClientRect() ?? null;

  function showLive(s: Session) {
    let hint: Live["hint"] = null;
    if (s.kind === "hero" && s.onMap) {
      const drop = resolveHeroDrop(s.world, s.layout.monsters, s.id, s.cursor, s.pos, s.shift);
      if (drop && "monsterId" in drop) {
        hint = { monsterId: drop.monsterId, kind: drop.shift ? "secondary" : "assign" };
      }
    }
    const overShelf = dropAction(s.kind, s.client, s.onMap, shelfRect()) === "slay";
    const drag: LiveDrag = { kind: s.kind, id: s.id, pos: s.pos };
    s.frame = layoutWithDrag(s.world, s.layout, drag, s.frame);
    setLive({ drag, layout: s.frame, hint, overShelf });
  }

  function track(s: Session, clientX: number, clientY: number) {
    const handle = map.current;
    if (!handle) return;
    s.cursor = handle.clientToWorld(clientX, clientY);
    s.client = { x: clientX, y: clientY };
    s.onMap = handle.isOnMap(clientX, clientY);
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
    // Let go over a HUD surface, a figure snaps back: it must not land on a
    // monster hidden under it, nor stand idle there. The trophy shelf slays a monster.
    const action = dropAction(s.kind, s.client, s.onMap, shelfRect());
    if (action === "none") return;
    if (action === "slay") {
      slay(s.id);
      return;
    }
    if (s.kind === "monster") {
      const home = s.world.monsters.find((m) => m.id === s.id)?.pos;
      if (home) run({ kind: "moveMonster", id: s.id, pos: round(homeAfterDrag(home, s.origin, s.pos)) });
      return;
    }
    const placed = s.layout.heroes.find((h) => h.hero.id === s.id);
    if (!placed) return;
    const standAt = round(heroHomeAfterDrag(placed, s.origin, s.pos));
    const drop = resolveHeroDrop(s.world, s.layout.monsters, s.id, s.cursor, standAt, e.shiftKey);
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
        setLink(null);
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
        ev.preventDefault(); // tells the card and dialogs this Esc is taken
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
      world,
      layout,
      moved: false,
      shift: e.shiftKey,
      cursor: startWorld,
      client: { x: e.clientX, y: e.clientY },
      pos: origin,
      onMap: true,
      frame: layout,
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

  /** Enter or Space on a focused figure or arrow does what a click does, unless a drag is under way. */
  function onActivateKey(e: ReactKeyboardEvent<SVGGElement>, run: () => void) {
    if ((e.key !== "Enter" && e.key !== " ") || session.current) return;
    e.preventDefault();
    run();
  }

  /** Handlers for a draggable monster or hero. `onClick` runs only for a press without a drag, or for Enter or Space. */
  function bindFigure(kind: "monster" | "hero", id: string, onClick: () => void): FigureHandlers {
    return {
      onPointerDown: (e) => start(kind, id, e),
      onClick: (e) => {
        if (guardClick(e)) onClick();
      },
      onKeyDown: (e) => onActivateKey(e, onClick),
    };
  }

  /** Handlers for a target arrow: a click, Enter or Space opens its buttons. */
  function bindLink(heroId: string, monsterId: string): FigureHandlers {
    const open = () => setLink({ heroId, monsterId });
    return {
      onPointerDown: (e) => {
        e.stopPropagation();
        suppressClick.current = false;
      },
      onClick: (e) => {
        if (guardClick(e)) open();
      },
      onKeyDown: (e) => onActivateKey(e, open),
    };
  }

  return {
    /** The world in the game, without the live drag. */
    world,
    /** Layout to draw: the world plus the figure being dragged. */
    layout,
    bindFigure,
    bindLink,
    /** Highlight for a monster while a hero is dragged over it. */
    dropHint: (monsterId: string): DropHint | null =>
      live?.hint?.monsterId === monsterId ? live.hint.kind : null,
    /** Slays a monster (the card's Slay), with the slay toast and its Undo. */
    slay,
    /** Brings a slain monster back to the table (Undo on the slay toast, Revive in the trophy hall). */
    revive,
    /** Attach to the trophy shelf: a monster dropped on it is slain. */
    shelfRef,
    /** How the trophy shelf shows during a monster drag; null otherwise. */
    shelfHint: (live?.drag.kind === "monster" ? (live.overShelf ? "over" : "armed") : null) as ShelfHint | null,
    /** The figure being dragged, to draw on top of everything. */
    lifted: drag ? { kind: drag.kind, id: drag.id } : null,
    /** The arrow whose buttons are open. */
    link,
    closeLink: () => setLink(null),
    makeMain: (t: TargetRef) => {
      setLink(null);
      run({ kind: "makeMain", heroId: t.heroId, monsterId: t.monsterId });
    },
    removeTarget: (t: TargetRef) => {
      setLink(null);
      run({ kind: "removeTarget", heroId: t.heroId, monsterId: t.monsterId });
    },
  };
}

function round(p: Pos): Pos {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/** What each op does, for "Couldn't <what>: <reason>." when the rules refuse it. */
const OP_WHAT: Record<WorldOp["kind"], string> = {
  moveMonster: "move the monster",
  dropHero: "move the hero",
  makeMain: "make it the main target",
  removeTarget: "remove the target",
  slay: "slay the monster",
  revive: "revive the monster",
};
