import type { Hero, Monster, Pos, World } from "@/lib/types";
import { alive } from "@/lib/domain";
import { HERO_BASE_RADIUS, monsterBaseRadius } from "./rings";

/*
 * Where every figure stands on the map, worked out from the data alone.
 *
 * Around each monster:
 * - The name label sits right under the monster's base.
 * - Main fighters stand on an arc that starts at the top and fans out to both
 *   sides, in hero-id order. The arc never enters a wedge at the bottom
 *   (LABEL_WEDGE), so heroes never cover the label. When the arc would be too
 *   crowded, the ring radius grows instead.
 * - Secondary targets don't move a hero; its arrows show them (see links.ts).
 */

/** Space between a monster base and its ring of heroes (room for the main-target arrow). */
const RING_GAP = 24;
/** Space between neighbouring heroes on an arc (leaves room for their labels). */
const HERO_GAP = 16;
/** Angular size of the label wedge at the bottom of a monster, kept free of figures. */
export const LABEL_WEDGE = (140 * Math.PI) / 180;
/** Half of the arc available to figures, measured from the top either way. */
const HALF_ARC = Math.PI - LABEL_WEDGE / 2;

export type PlacedMonster = {
  monster: Monster;
  pos: Pos;
  radius: number;
  /** Nobody has this monster in their targets. */
  unfought: boolean;
};

export type PlacedHero = {
  hero: Hero;
  pos: Pos;
  /** Living, de-duplicated targets in order; [0] = main. Empty = idle. */
  targets: string[];
};

export type WorldLayout = {
  monsters: PlacedMonster[];
  heroes: PlacedHero[];
};

/** Angle (radians, 0 = straight up, clockwise) between neighbours `chord` apart on a circle of `radius`. */
function stepAngle(chord: number, radius: number): number {
  return 2 * Math.asin(Math.min(1, chord / (2 * radius)));
}

/** Smallest radius at which `count` figures `chord` apart fit inside the arc. */
function radiusToFit(count: number, chord: number): number {
  if (count <= 1) return 0;
  // Need (count - 1) * stepAngle(chord, r) <= 2 * HALF_ARC.
  const half = HALF_ARC / (count - 1);
  return half >= Math.PI / 2 ? chord / 2 : chord / (2 * Math.sin(half));
}

/**
 * `count` points on a circle, fanned out symmetrically around the top,
 * neighbours `chord` apart. Order: left to right (clockwise on screen).
 */
export function arcPositions(center: Pos, count: number, radius: number, chord: number): Pos[] {
  const step = stepAngle(chord, radius);
  const start = (-(count - 1) * step) / 2;
  const out: Pos[] = [];
  for (let i = 0; i < count; i++) {
    const a = start + i * step;
    out.push({ x: center.x + radius * Math.sin(a), y: center.y - radius * Math.cos(a) });
  }
  return out;
}

/** Radius of the ring of main fighters around a monster with base radius `base`. */
export function heroRingRadius(base: number, count: number): number {
  return Math.max(base + RING_GAP + HERO_BASE_RADIUS, radiusToFit(count, 2 * HERO_BASE_RADIUS + HERO_GAP));
}

const byId = (a: Hero, b: Hero) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Places every living monster and every hero. Pure: the same world
 * always gives the same layout, so rings are stable across reloads.
 *
 * Targets that point at missing or slain monsters (possible after a hand edit)
 * are skipped. A hero left with no valid target stands at its `pos`, or at the
 * origin if it has none.
 */
export function layoutWorld(world: World): WorldLayout {
  const living = alive(world.monsters);
  const livingIds = new Set(living.map((m) => m.id));

  const mainOf = new Map<string, Hero[]>();
  const targeted = new Set<string>();
  const heroes: PlacedHero[] = [];
  const pending = new Map<string, PlacedHero>();

  for (const hero of world.heroes) {
    const targets = [...new Set(hero.targets)].filter((id) => livingIds.has(id));
    targets.forEach((id) => targeted.add(id));
    if (targets.length === 0) {
      heroes.push({ hero, pos: hero.pos ?? { x: 0, y: 0 }, targets });
      continue;
    }
    push(mainOf, targets[0], hero);
    const placed: PlacedHero = { hero, pos: { x: 0, y: 0 }, targets };
    pending.set(hero.id, placed);
    heroes.push(placed);
  }

  const monsters: PlacedMonster[] = [];

  for (const monster of living) {
    const radius = monsterBaseRadius(monster.size);
    monsters.push({
      monster,
      pos: monster.pos,
      radius,
      unfought: !targeted.has(monster.id),
    });

    const main = (mainOf.get(monster.id) ?? []).sort(byId);
    if (main.length > 0) {
      const ring = heroRingRadius(radius, main.length);
      const spots = arcPositions(monster.pos, main.length, ring, 2 * HERO_BASE_RADIUS + HERO_GAP);
      main.forEach((hero, i) => {
        pending.get(hero.id)!.pos = spots[i];
      });
    }
  }

  return { monsters, heroes };
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** Points the opening view should fit: every living monster and every hero. */
export function openingPoints(layout: WorldLayout): Pos[] {
  return [...layout.monsters.map((m) => m.pos), ...layout.heroes.map((h) => h.pos)];
}
