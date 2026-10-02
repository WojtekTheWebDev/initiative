import type { Hero, Monster, Pos, World } from "@/lib/types";
import { alive } from "@/lib/domain";
import { fnv1a, relax, type ForceLink, type ForceNode } from "./force";
import { HERO_BASE_RADIUS, monsterBaseRadius } from "./rings";

/*
 * Where every figure stands on the map, worked out from the data alone by the
 * force solver in force.ts.
 *
 * - A stored `pos` is a home. Every monster and every idle hero is held to its
 *   home by the same weak spring (ANCHOR), so clusters can nudge it aside and it
 *   drifts back when there is room.
 * - An engaged hero has no home. A spring to each of its targets pulls it
 *   toward them and pulls them toward it, so heroes and monsters that target
 *   each other gather into a cluster. The main target pulls harder and closer
 *   than secondary ones.
 * - Nothing overlaps, and no figure stands on a monster's name label.
 */

/** Strength of the spring that holds a monster or an idle hero to its home. */
export const ANCHOR = 0.03;
/** Strength of the spring between a hero and its main target. */
export const MAIN_PULL = 0.6;
/** Strength of the spring between a hero and each secondary target. */
export const SECONDARY_PULL = 0.2;
/** Space between the bases of a hero and its main target (room for the arrow). */
export const MAIN_GAP = 28;
/** Space between the bases of a hero and a secondary target. */
export const SECONDARY_GAP = 70;
/** Estimated width of one character of a monster's name label, in world units. */
export const LABEL_CHAR_WIDTH = 8;
/** Widest keep-out box under a monster's name, in world units. */
export const LABEL_MAX_WIDTH = 240;
/** Height of the keep-out box under a monster's name, in world units. */
export const LABEL_HEIGHT = 22;
/** Space between a monster's base and its name label, in world units. */
export const LABEL_GAP = 4;
/** How far from the middle of its targets' homes an engaged hero starts, so heroes that share targets never start on one point. */
const START_SPREAD = 12;

export type PlacedMonster = {
  monster: Monster;
  /** Where it is drawn. It differs from `monster.pos`, its home, when it is pulled or nudged. */
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

export type LayoutOptions = {
  /** A monster held at a fixed point instead of its home, such as the one being dragged. */
  pin?: { id: string; pos: Pos };
};

/** The keep-out box under a monster, roughly the size of its name label. */
export function labelBox(name: string): { width: number; height: number; gap: number } {
  return {
    width: Math.min(LABEL_MAX_WIDTH, name.length * LABEL_CHAR_WIDTH),
    height: LABEL_HEIGHT,
    gap: LABEL_GAP,
  };
}

/** Where an idle hero is held: its `pos`, or the origin if it has none. */
export function idleHome(hero: Hero): Pos {
  return hero.pos ?? { x: 0, y: 0 };
}

const monsterNode = (id: string) => `m:${id}`;
const heroNode = (id: string) => `h:${id}`;
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Places every living monster and every hero. Pure: the same world (and pin)
 * always gives the same layout, whatever order the files list things in.
 * Every figure starts from its home, never from an earlier picture, so a
 * figure that was nudged aside is drawn back at home once there is room.
 *
 * Targets that point at missing or slain monsters (possible after a hand edit)
 * are skipped. A hero left with no valid target is idle at its `pos`, or at the
 * origin if it has none.
 */
export function layoutWorld(world: World, opts: LayoutOptions = {}): WorldLayout {
  const living = alive(world.monsters);
  const pin = opts.pin && living.some((m) => m.id === opts.pin!.id) ? opts.pin : null;
  /** Where each monster starts: its home, or the pin. */
  const starts = new Map(living.map((m) => [m.id, m.id === pin?.id ? pin.pos : m.pos]));

  const targeted = new Set<string>();
  const heroes: PlacedHero[] = world.heroes.map((hero) => {
    const targets = [...new Set(hero.targets)].filter((id) => starts.has(id));
    targets.forEach((id) => targeted.add(id));
    return { hero, pos: { x: 0, y: 0 }, targets };
  });
  const monsters: PlacedMonster[] = living.map((monster) => ({
    monster,
    pos: monster.pos,
    radius: monsterBaseRadius(monster.size),
    unfought: !targeted.has(monster.id),
  }));

  // Nodes go to the solver sorted by id, so the order of the files never matters.
  const nodes: ForceNode[] = [];
  const links: ForceLink[] = [];
  for (const m of [...monsters].sort((a, b) => byId(a.monster, b.monster))) {
    const id = monsterNode(m.monster.id);
    nodes.push({
      id,
      radius: m.radius,
      start: starts.get(m.monster.id)!,
      pinned: m.monster.id === pin?.id,
      anchor: { pos: m.monster.pos, strength: ANCHOR },
      keepOut: labelBox(m.monster.name),
    });
  }
  const radii = new Map(monsters.map((m) => [m.monster.id, m.radius]));
  for (const h of [...heroes].sort((a, b) => byId(a.hero, b.hero))) {
    const id = heroNode(h.hero.id);
    if (h.targets.length === 0) {
      const home = idleHome(h.hero);
      nodes.push({
        id,
        radius: HERO_BASE_RADIUS,
        start: home,
        anchor: { pos: home, strength: ANCHOR },
      });
      continue;
    }
    nodes.push({
      id,
      radius: HERO_BASE_RADIUS,
      start: engagedStart(h.hero.id, h.targets.map((t) => starts.get(t)!)),
    });
    h.targets.forEach((target, i) => {
      const main = i === 0;
      links.push({
        source: id,
        target: monsterNode(target),
        length: radii.get(target)! + HERO_BASE_RADIUS + (main ? MAIN_GAP : SECONDARY_GAP),
        strength: main ? MAIN_PULL : SECONDARY_PULL,
      });
    });
  }

  const out = relax(nodes, links);
  for (const m of monsters) m.pos = out.get(monsterNode(m.monster.id))!;
  for (const h of heroes) h.pos = out.get(heroNode(h.hero.id))!;
  return { monsters, heroes };
}

/** The middle of where an engaged hero's targets start, moved a little in a direction set by its id. */
function engagedStart(heroId: string, targets: Pos[]): Pos {
  const x = targets.reduce((sum, p) => sum + p.x, 0) / targets.length;
  const y = targets.reduce((sum, p) => sum + p.y, 0) / targets.length;
  const angle = (fnv1a(heroId) / 0x100000000) * 2 * Math.PI;
  return { x: x + START_SPREAD * Math.cos(angle), y: y + START_SPREAD * Math.sin(angle) };
}

/** Points the opening view should fit: every living monster and every hero. */
export function openingPoints(layout: WorldLayout): Pos[] {
  return [...layout.monsters.map((m) => m.pos), ...layout.heroes.map((h) => h.pos)];
}
