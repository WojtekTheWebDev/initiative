import type { Pos } from "@/lib/types";
import { TAG_ROOM_SCALE, heroShape, monsterShape, type WorldLayout } from "./layout";
import { miniBodyRect, monsterMini, type Rect } from "./minis";
import { HERO_BASE_RADIUS, baseRim } from "./rings";

/*
 * Target arrows, worked out from the layout and never stored. Anything that
 * moves a figure (a live drag, a new layout) moves its arrows with it.
 */

/** World units between a figure's base (or name tag) and the end of an arrow, so the arrowhead touches it without covering it. */
export const LINK_GAP = 4;

/** An arrow from a hero to one of its targets. `from` and `to` are already trimmed to the figures' base ellipses and name tags. */
export type PlacedLink = { heroId: string; monsterId: string; main: boolean; from: Pos; to: Pos };

const byHeroId = (a: { hero: { id: string } }, b: { hero: { id: string } }) =>
  a.hero.id < b.hero.id ? -1 : a.hero.id > b.hero.id ? 1 : 0;

/**
 * One link per (hero, living target), ordered by hero id and then by the hero's
 * target order, so `main` is true for the first link of each hero. Each end
 * stops LINK_GAP short of the base ellipse it points at (see BASE_SQUASH).
 * Name tags are drawn over the arrows, so an arrow that would run under the
 * hero's own tag starts past it, and one that would run under the monster's
 * tag ends LINK_GAP before it: no arrowhead ever hides under a tag. Tags are
 * sized for zoom `scale`. Targets missing from the layout are skipped, and so
 * are links whose figures are too close for an arrow to fit between them.
 */
export function linksOf(layout: WorldLayout, scale: number = TAG_ROOM_SCALE): PlacedLink[] {
  const monsters = new Map(layout.monsters.map((m) => [m.monster.id, m]));
  const links: PlacedLink[] = [];
  for (const h of [...layout.heroes].sort(byHeroId)) {
    const heroTag = grow(heroShape(h, scale).tag, LINK_GAP);
    h.targets.forEach((monsterId, i) => {
      const m = monsters.get(monsterId);
      if (!m) return;
      const dx = m.pos.x - h.pos.x;
      const dy = m.pos.y - h.pos.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) return;
      const ux = dx / d;
      const uy = dy / d;
      let start = baseRim(HERO_BASE_RADIUS, ux, uy) + LINK_GAP;
      let end = d - baseRim(m.radius, ux, uy) - LINK_GAP;
      const along = (t: number): Pos => ({ x: h.pos.x + ux * t, y: h.pos.y + uy * t });
      const own = crossing(along(start), along(end), heroTag);
      if (own) start += own[1] * (end - start);
      // Of the monster's tag and its model, the arrow stops at whichever it reaches first.
      const model = miniBodyRect(monsterMini(m.monster), m.pos, m.radius);
      let reach = 1;
      for (const box of [monsterShape(m, scale).tag, model]) {
        const hit = crossing(along(start), along(end), grow(box, LINK_GAP));
        if (hit) reach = Math.min(reach, hit[0]);
      }
      end = start + reach * (end - start);
      if (end <= start) return;
      links.push({ heroId: h.hero.id, monsterId, main: i === 0, from: along(start), to: along(end) });
    });
  }
  return links;
}

function grow(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, width: r.width + 2 * by, height: r.height + 2 * by };
}

/**
 * Where the segment from `a` to `b` runs inside `rect`, as the share of the
 * way along it that it enters and leaves (each 0 to 1), or null if it misses.
 */
export function crossing(a: Pos, b: Pos, rect: Rect): [number, number] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sides: [number, number][] = [
    [-dx, a.x - rect.x],
    [dx, rect.x + rect.width - a.x],
    [-dy, a.y - rect.y],
    [dy, rect.y + rect.height - a.y],
  ];
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [t0, t1];
}
