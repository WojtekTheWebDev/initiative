import type { Pos, World } from "@/lib/types";
import * as domain from "@/lib/domain";
import type { PlacedMonster, WorldLayout } from "@/lib/map/layout";

/*
 * Pure helpers behind figure dragging (no React, no DOM), so they can be unit-tested.
 */

/** Pointer travel (screen px) below which a press on a figure is a click, not a drag. */
export const DRAG_THRESHOLD = 4;

export function pastThreshold(start: Pos, now: Pos, threshold = DRAG_THRESHOLD): boolean {
  return Math.hypot(now.x - start.x, now.y - start.y) >= threshold;
}

/** What a hero drop does; mirrors the second argument of the `dropHero` Server Action. */
export type HeroDrop = { monsterId: string; shift: boolean } | { pos: Pos };

/** One change to the world that the client applies optimistically and sends to the server. */
export type WorldOp =
  | { kind: "moveMonster"; id: string; pos: Pos }
  | { kind: "dropHero"; heroId: string; drop: HeroDrop }
  | { kind: "makeMain"; heroId: string; monsterId: string }
  | { kind: "removeTarget"; heroId: string; monsterId: string };

/**
 * Applies an op with the same lib/domain rules the server uses (see app/actions.ts).
 * Never throws: an op that no longer fits the world (e.g. the server data changed
 * underneath) leaves it unchanged, and the server reports the real error.
 */
export function applyOp(world: World, op: WorldOp): World {
  try {
    switch (op.kind) {
      case "moveMonster":
        return domain.moveMonster(world, op.id, op.pos);
      case "makeMain":
        return domain.makeMain(world, op.heroId, op.monsterId);
      case "removeTarget":
        return domain.removeTarget(world, op.heroId, op.monsterId);
      case "dropHero": {
        const { heroId, drop } = op;
        if ("pos" in drop) return domain.setIdle(world, heroId, drop.pos);
        if (drop.shift) return domain.addGhost(world, heroId, drop.monsterId);
        const hero = world.heroes.find((h) => h.id === heroId);
        if (hero && hero.targets[0] === drop.monsterId) return world;
        return domain.assign(world, heroId, drop.monsterId);
      }
    }
  } catch {
    return world;
  }
}

/** The monster whose base contains `point` (nearest center wins when bases overlap), or null. */
export function hitTestMonster(monsters: PlacedMonster[], point: Pos): PlacedMonster | null {
  let best: PlacedMonster | null = null;
  let bestDist = Infinity;
  for (const m of monsters) {
    const d = Math.hypot(point.x - m.pos.x, point.y - m.pos.y);
    if (d <= m.radius && d < bestDist) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Works out what dropping `heroId` with the cursor at `cursor` does.
 * `standAt` is where the hero would stand if dropped on empty ground.
 * Returns null for a no-op: a plain drop on the current main target, or a
 * Shift+drop on a monster that is already a target.
 */
export function resolveHeroDrop(
  world: World,
  monsters: PlacedMonster[],
  heroId: string,
  cursor: Pos,
  standAt: Pos,
  shift: boolean,
): HeroDrop | null {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero) return null;
  const hit = hitTestMonster(monsters, cursor);
  if (!hit) return { pos: { x: standAt.x, y: standAt.y } };
  const monsterId = hit.monster.id;
  if (shift ? hero.targets.includes(monsterId) : hero.targets[0] === monsterId) return null;
  return { monsterId, shift };
}

/** A figure being dragged right now, in world units. */
export type LiveDrag =
  | { kind: "monster"; id: string; pos: Pos }
  | { kind: "hero"; id: string; pos: Pos };

/** Moves a dragged monster in the world before layout, so its heroes and arrows follow it. */
export function worldWithDrag(world: World, drag: LiveDrag | null): World {
  if (!drag || drag.kind !== "monster") return world;
  return applyOp(world, { kind: "moveMonster", id: drag.id, pos: drag.pos });
}

/**
 * Puts a dragged hero at the cursor after layout, so its arrows follow it. Its targets
 * (and so the monsters' unfought state) stay as they are until the drop.
 */
export function layoutWithDrag(layout: WorldLayout, drag: LiveDrag | null): WorldLayout {
  if (!drag || drag.kind !== "hero") return layout;
  return {
    ...layout,
    heroes: layout.heroes.map((h) => (h.hero.id === drag.id ? { ...h, pos: drag.pos } : h)),
  };
}
