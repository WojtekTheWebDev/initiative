import type { CSSProperties } from "react";
import type { Pos } from "@/lib/types";
import type { WorldLayout } from "@/lib/map/layout";
import { baseRim, HERO_BASE_RADIUS } from "@/lib/map/rings";

/** Screen-px sizes, kept the same at any zoom. */
const WIDTH = 3;
const DASH = 9;
const GAP = 7;
const HEAD = 13;
/** Screen px between a base's rim and the end of the path. */
const CLEARANCE = 6;
/** How far the path bows upward, as a share of its length. */
const BOW = 0.22;
const CORD = "#ffd96a";
const EDGE = "#2b1d06";

/**
 * The tutorial's hint for assigning: a dashed gold path laid on the felt from
 * an idle hero to the monster the coach card names, bowing upward, with an
 * arrowhead at the monster. Drawn in world space under the figures, like the
 * target arrows, and only while nothing is dragged.
 */
export function AssignPath({
  layout,
  scale,
  heroId,
  monsterId,
}: {
  layout: WorldLayout;
  /** Current camera scale (screen px per world unit). */
  scale: number;
  heroId: string;
  monsterId: string;
}) {
  const hero = layout.heroes.find((h) => h.hero.id === heroId);
  const monster = layout.monsters.find((m) => m.monster.id === monsterId);
  if (!hero || !monster) return null;

  const from = hero.pos;
  const to = monster.pos;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const startAt = baseRim(HERO_BASE_RADIUS, ux, uy) + CLEARANCE / scale;
  const endAt = length - baseRim(monster.radius, ux, uy) - CLEARANCE / scale;
  if (!(endAt > startAt)) return null;

  const start = { x: from.x + ux * startAt, y: from.y + uy * startAt };
  const end = { x: from.x + ux * endAt, y: from.y + uy * endAt };
  // The normal that points up the screen.
  const [nx, ny] = -ux <= 0 ? [uy, -ux] : [-uy, ux];
  const bow = (endAt - startAt) * BOW;
  const control = { x: (start.x + end.x) / 2 + nx * bow, y: (start.y + end.y) / 2 + ny * bow };
  const curve = `M${pt(start)} Q${pt(control)} ${pt(end)}`;

  const tx = end.x - control.x;
  const ty = end.y - control.y;
  const tl = Math.hypot(tx, ty);
  const head = HEAD / scale;
  const wing = (angle: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: end.x - ((tx * c - ty * s) / tl) * head, y: end.y - ((tx * s + ty * c) / tl) * head };
  };
  const arrowhead = `M${pt(wing(0.5))} L${pt(end)} L${pt(wing(-0.5))}`;

  const dashed = {
    strokeDasharray: `${DASH / scale} ${GAP / scale}`,
    className: "motion-safe:animate-hud-march",
    style: { "--hud-march": -(DASH + GAP) / scale } as CSSProperties,
  };
  const edge = { stroke: EDGE, strokeOpacity: 0.55, strokeWidth: (WIDTH + 2) / scale };
  const cord = { stroke: CORD, strokeWidth: WIDTH / scale };
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={curve} {...edge} {...dashed} />
      <path d={curve} {...cord} {...dashed} />
      <path d={arrowhead} {...edge} />
      <path d={arrowhead} {...cord} />
    </g>
  );
}

const pt = (p: Pos) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
