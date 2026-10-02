import type { Pos } from "@/lib/types";
import type { WorldLayout } from "./layout";
import { HERO_BASE_RADIUS, baseRim } from "./rings";

/*
 * Target arrows, worked out from the layout and never stored. Anything that
 * moves a figure (a live drag, a new layout) moves its arrows with it.
 */

/** World units between a figure's base and the end of an arrow, so the arrowhead touches the base without covering it. */
export const LINK_GAP = 4;

/** An arrow from a hero to one of its targets. `from` and `to` are already trimmed to the figures' base ellipses. */
export type PlacedLink = { heroId: string; monsterId: string; main: boolean; from: Pos; to: Pos };

const byHeroId = (a: { hero: { id: string } }, b: { hero: { id: string } }) =>
  a.hero.id < b.hero.id ? -1 : a.hero.id > b.hero.id ? 1 : 0;

/**
 * One link per (hero, living target), ordered by hero id and then by the hero's
 * target order, so `main` is true for the first link of each hero. Each end
 * stops LINK_GAP short of the base ellipse it points at (see BASE_SQUASH).
 * Targets missing from the layout are skipped, and so are links whose figures
 * are too close for an arrow to fit between their bases.
 */
export function linksOf(layout: WorldLayout): PlacedLink[] {
  const monsters = new Map(layout.monsters.map((m) => [m.monster.id, m]));
  const links: PlacedLink[] = [];
  for (const h of [...layout.heroes].sort(byHeroId)) {
    h.targets.forEach((monsterId, i) => {
      const m = monsters.get(monsterId);
      if (!m) return;
      const dx = m.pos.x - h.pos.x;
      const dy = m.pos.y - h.pos.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) return;
      const ux = dx / d;
      const uy = dy / d;
      const start = baseRim(HERO_BASE_RADIUS, ux, uy) + LINK_GAP;
      const end = d - baseRim(m.radius, ux, uy) - LINK_GAP;
      if (end <= start) return;
      links.push({
        heroId: h.hero.id,
        monsterId,
        main: i === 0,
        from: { x: h.pos.x + ux * start, y: h.pos.y + uy * start },
        to: { x: h.pos.x + ux * end, y: h.pos.y + uy * end },
      });
    });
  }
  return links;
}
