"use client";

import { useEffect, useState } from "react";
import type { Pos } from "@/lib/types";
import type { WorldLayout } from "@/lib/map/layout";
import { prefersReducedMotion } from "./useCamera";

/** How long figures take to glide to a new layout. */
export const GLIDE_MS = 350;
/** Figures that move less than this (world units) don't start a glide. */
const STILL = 0.5;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type Glide = {
  /** Where each figure was drawn when the glide began (see `positions`). */
  from: Map<string, Pos>;
  to: WorldLayout;
  /** Progress from 0 to 1. */
  t: number;
};

/**
 * The layout to draw. When `layout` changes (a drop, an optimistic update,
 * server data arriving), every figure glides from where it is drawn to its new
 * place over GLIDE_MS with ease-out. While `live` (a figure is being dragged)
 * and with `prefers-reduced-motion`, `layout` is drawn as it is. Figures that
 * are new appear in place, and removed ones disappear at once.
 *
 * Only for drawing: hit-testing and drops use `layout`, never the in-between frames.
 */
export function useGlide(layout: WorldLayout, live: boolean): WorldLayout {
  const [target, setTarget] = useState(layout);
  const [glide, setGlide] = useState<Glide | null>(null);

  if (layout !== target) {
    // A new layout: start from wherever the figures are drawn right now.
    setTarget(layout);
    const from = positions(glide ? frame(glide) : target);
    setGlide(live || prefersReducedMotion() || !movesAny(from, layout) ? null : { from, to: layout, t: 0 });
  }

  const to = glide?.to ?? null;
  useEffect(() => {
    if (!to) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / GLIDE_MS);
      setGlide((g) => (g?.to !== to ? g : t >= 1 ? null : { ...g, t }));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);

  return glide ? frame(glide) : layout;
}

const monsterKey = (id: string) => `m:${id}`;
const heroKey = (id: string) => `h:${id}`;

/** Where every figure in `layout` is drawn, by `m:<monster id>` and `h:<hero id>`. */
function positions(layout: WorldLayout): Map<string, Pos> {
  const out = new Map<string, Pos>();
  for (const m of layout.monsters) out.set(monsterKey(m.monster.id), m.pos);
  for (const h of layout.heroes) out.set(heroKey(h.hero.id), h.pos);
  return out;
}

function movesAny(from: Map<string, Pos>, to: WorldLayout): boolean {
  const moves = (key: string, p: Pos) => {
    const f = from.get(key);
    return f !== undefined && Math.hypot(p.x - f.x, p.y - f.y) > STILL;
  };
  return (
    to.monsters.some((m) => moves(monsterKey(m.monster.id), m.pos)) ||
    to.heroes.some((h) => moves(heroKey(h.hero.id), h.pos))
  );
}

/** `to` with every figure part of the way from its `from` position. */
function frame({ from, to, t }: Glide): WorldLayout {
  const k = easeOutCubic(t);
  const at = (key: string, p: Pos): Pos => {
    const f = from.get(key);
    return f ? { x: f.x + (p.x - f.x) * k, y: f.y + (p.y - f.y) * k } : p;
  };
  return {
    monsters: to.monsters.map((m) => ({ ...m, pos: at(monsterKey(m.monster.id), m.pos) })),
    heroes: to.heroes.map((h) => ({ ...h, pos: at(heroKey(h.hero.id), h.pos) })),
  };
}
