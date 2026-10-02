"use client";

import { useEffect, useState } from "react";
import type { Pos } from "@/lib/types";
import type { WorldLayout } from "@/lib/map/layout";
import { prefersReducedMotion } from "./useCamera";

/** How long figures take to glide to a new layout. */
export const GLIDE_MS = 350;
/**
 * While a figure is dragged, the others follow the layout with this time
 * constant, so a figure that a moving cluster shoves to its other side slides
 * there instead of jumping in one frame.
 */
export const FOLLOW_MS = 70;
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

/** During a drag: where each figure is drawn, catching up with `to`. */
type Follow = { at: Map<string, Pos>; to: WorldLayout; lifted: string };

/**
 * The layout to draw. When `layout` changes (a drop, an optimistic update,
 * server data arriving), every figure glides from where it is drawn to its new
 * place over GLIDE_MS with ease-out. While a figure is `lifted` (dragged), it
 * is drawn exactly where `layout` puts it and every other figure follows its
 * place with FOLLOW_MS of easing. With `prefers-reduced-motion`, `layout` is
 * drawn as it is. Figures that are new appear in place, and removed ones
 * disappear at once.
 *
 * Only for drawing: hit-testing and drops use `layout`, never the in-between frames.
 */
export function useGlide(layout: WorldLayout, lifted: { kind: "monster" | "hero"; id: string } | null): WorldLayout {
  const [target, setTarget] = useState(layout);
  const [glide, setGlide] = useState<Glide | null>(null);
  const [follow, setFollow] = useState<Follow | null>(null);
  const liftedKey = lifted && (lifted.kind === "monster" ? monsterKey(lifted.id) : heroKey(lifted.id));

  if (layout !== target) {
    // A new layout: start from wherever the figures are drawn right now.
    setTarget(layout);
    const now = positions(follow ? followFrame(follow) : glide ? frame(glide) : target);
    if (prefersReducedMotion()) {
      setGlide(null);
      setFollow(null);
    } else if (liftedKey) {
      setGlide(null);
      setFollow({ at: now, to: layout, lifted: liftedKey });
    } else {
      setFollow(null);
      setGlide(movesAny(now, layout) ? { from: now, to: layout, t: 0 } : null);
    }
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

  const following = follow !== null;
  useEffect(() => {
    if (!following) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      const dt = last === null ? 16 : now - last;
      last = now;
      const k = 1 - Math.exp(-dt / FOLLOW_MS);
      // Once every figure has caught up, the state stays the same and nothing re-renders.
      setFollow((f) => (f && !caughtUp(f) ? { ...f, at: catchUp(f, k) } : f));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [following]);

  return follow ? followFrame(follow) : glide ? frame(glide) : layout;
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

function caughtUp({ at, to }: Follow): boolean {
  return !movesAny(at, to);
}

/** Every followed figure moved `k` of the way from where it is drawn to its place in `to`. */
function catchUp({ at, to, lifted }: Follow, k: number): Map<string, Pos> {
  const out = new Map<string, Pos>();
  for (const [key, p] of positions(to)) {
    const a = at.get(key);
    out.set(key, !a || key === lifted ? p : { x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k });
  }
  return out;
}

/** `to` with every figure where `at` has it drawn, and the lifted one exactly in its place. */
function followFrame({ at, to, lifted }: Follow): WorldLayout {
  const pos = (key: string, p: Pos) => (key === lifted ? p : (at.get(key) ?? p));
  return {
    monsters: to.monsters.map((m) => ({ ...m, pos: pos(monsterKey(m.monster.id), m.pos) })),
    heroes: to.heroes.map((h) => ({ ...h, pos: pos(heroKey(h.hero.id), h.pos) })),
  };
}
