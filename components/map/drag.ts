import type { Pos, World } from "@/lib/types";
import * as domain from "@/lib/domain";
import type { HeroBefore } from "@/lib/domain";
import { layoutWorld, type PlacedMonster, type WorldLayout } from "@/lib/map/layout";
import { hitsMini, monsterMini } from "@/lib/map/minis";

/*
 * Pure helpers behind figure dragging (no React, no DOM), so they can be unit-tested.
 */

/** Pointer travel (screen px) below which a press on a figure is a click, not a drag. */
export const DRAG_THRESHOLD = 4;

export function pastThreshold(start: Pos, now: Pos, threshold = DRAG_THRESHOLD): boolean {
  return Math.hypot(now.x - start.x, now.y - start.y) >= threshold;
}

/** What a hero drop does: a monster to add to its targets, or ground for an idle hero to stand on. */
export type HeroDrop = { monsterId: string } | { pos: Pos };

/** One change to the world made on the table: a drop, an arrow button, a slay or a revive. */
export type WorldOp =
  | { kind: "moveMonster"; id: string; pos: Pos }
  | { kind: "dropHero"; heroId: string; drop: HeroDrop }
  | { kind: "makeMain"; heroId: string; monsterId: string }
  | { kind: "removeTarget"; heroId: string; monsterId: string }
  | { kind: "slay"; id: string; today: string }
  | { kind: "revive"; id: string; before: HeroBefore[] };

/**
 * Applies an op with its lib/domain rule. Throws what the rule throws for an
 * op that doesn't fit the world (e.g. an id that is gone).
 */
export function applyOp(world: World, op: WorldOp): World {
  switch (op.kind) {
    case "moveMonster":
      return domain.moveMonster(world, op.id, op.pos);
    case "makeMain":
      return domain.makeMain(world, op.heroId, op.monsterId);
    case "removeTarget":
      return domain.removeTarget(world, op.heroId, op.monsterId);
    case "slay":
      return domain.slay(world, op.id, op.today);
    case "revive":
      return domain.revive(world, op.id, op.before);
    case "dropHero": {
      const { heroId, drop } = op;
      if ("pos" in drop) return domain.setIdle(world, heroId, drop.pos);
      return domain.addTarget(world, heroId, drop.monsterId);
    }
  }
}

/** A box on the screen in client px, as `getBoundingClientRect()` gives it. */
export type ScreenRect = { left: number; top: number; right: number; bottom: number };

/** What letting go of a dragged figure does. */
export type DropAction = "slay" | "place" | "none";

/**
 * What a drop at `client` does. `onMap` says the point shows the map (not a
 * HUD surface over it); `shelf` is the trophy shelf's box, if it is on screen.
 * - A monster let go over the shelf is slain; anywhere else on the map it is
 *   placed (its home moves). Only the shelf's own box counts, so a drop just
 *   short of it only moves the monster.
 * - A hero is placed on the map (see resolveHeroDrop); over the shelf it snaps back.
 * - Either let go over any other HUD surface snaps back.
 */
export function dropAction(kind: "monster" | "hero", client: Pos, onMap: boolean, shelf: ScreenRect | null): DropAction {
  if (shelf && within(shelf, client)) return kind === "monster" ? "slay" : "none";
  return onMap ? "place" : "none";
}

function within(r: ScreenRect, p: Pos): boolean {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

/**
 * The monster under `point`, or null. A monster is hit on its base ellipse or
 * on the body of its mini, so a hero dropped on a dragon's wing lands on the
 * dragon. Where figures overlap, the one drawn in front (lower on the screen)
 * wins, then the one with the nearest center.
 */
export function hitTestMonster(monsters: PlacedMonster[], point: Pos): PlacedMonster | null {
  let best: PlacedMonster | null = null;
  let bestDist = Infinity;
  for (const m of monsters) {
    if (!hitsMini(monsterMini(m.monster), m.pos, m.radius, point)) continue;
    const d = Math.hypot(point.x - m.pos.x, point.y - m.pos.y);
    if (!best || m.pos.y > best.pos.y || (m.pos.y === best.pos.y && d < bestDist)) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Works out what dropping `heroId` with the cursor at `cursor` does.
 * - On a monster, the monster is added to the hero's targets: it becomes the
 *   main target of an idle hero and a secondary one of an engaged hero.
 * - On empty ground, an idle hero stands at `standAt`. An engaged hero keeps
 *   its targets; it only settles on the side of its monsters where it was let
 *   go (see the drop in useFigureDrag).
 * Returns null for a drop that changes no data: on a monster that is already
 * a target, or an engaged hero on empty ground.
 */
export function resolveHeroDrop(
  world: World,
  monsters: PlacedMonster[],
  heroId: string,
  cursor: Pos,
  standAt: Pos,
): HeroDrop | null {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero) return null;
  const hit = hitTestMonster(monsters, cursor);
  if (!hit) return hero.targets.length ? null : { pos: { x: standAt.x, y: standAt.y } };
  const monsterId = hit.monster.id;
  return hero.targets.includes(monsterId) ? null : { monsterId };
}

/** Solver steps for each frame of a monster drag, which starts from the frame before (see layoutWithDrag). */
export const DRAG_ITERATIONS = 40;
export const DRAG_SETTLE = 40;

/** A figure being dragged right now. `pos` is where it is drawn, in world units. */
export type LiveDrag = { kind: "monster" | "hero"; id: string; pos: Pos };

/**
 * The layout to draw during a drag. `layout` is `world` laid out without the drag.
 * - A dragged monster is pinned at `pos` and the map is laid out again around
 *   it, so its fighters come along and anything in the way is nudged aside.
 *   It starts from `previous` (the last frame of the drag, or `layout` on the
 *   first), so DRAG_ITERATIONS and DRAG_SETTLE steps are enough on every
 *   pointer move. The drop lays the map out in full again, starting from the
 *   last frame (see useFigureDrag).
 * - A dragged hero only moves itself (its arrows follow). Nothing else moves
 *   until the drop, so monsters never slide out from under the cursor. Its
 *   targets, and so the monsters' unfought state, stay as they are too.
 */
export function layoutWithDrag(
  world: World,
  layout: WorldLayout,
  drag: LiveDrag | null,
  previous: WorldLayout = layout,
): WorldLayout {
  if (!drag) return layout;
  if (drag.kind === "monster") {
    return layoutWorld(world, {
      pin: { id: drag.id, pos: drag.pos },
      from: previous,
      iterations: DRAG_ITERATIONS,
      settle: DRAG_SETTLE,
    });
  }
  return {
    ...layout,
    heroes: layout.heroes.map((h) => (h.hero.id === drag.id ? { ...h, pos: drag.pos } : h)),
  };
}

/**
 * Where a dragged figure's home goes: it moves by as much as the figure was
 * dragged (`drop - press`, both drawn positions). The drawn position can differ
 * from the home when the figure is pulled or nudged, so saving the drop point
 * itself would make it jump. Heroes never pull a monster, so it settles
 * exactly where it was let go unless another figure is in the way.
 */
export function homeAfterDrag(home: Pos, press: Pos, drop: Pos): Pos {
  return { x: home.x + drop.x - press.x, y: home.y + drop.y - press.y };
}
