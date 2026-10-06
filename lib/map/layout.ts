import type { Hero, Monster, Pos, World } from "@/lib/types";
import { alive } from "@/lib/domain";
import { fnv1a, relax, type ForceBox, type ForceLink, type ForceNode } from "./force";
import { heroMini, miniBodyRect, monsterMini, type Mini, type Rect } from "./minis";
import { BASE_SQUASH, HERO_BASE_RADIUS, monsterBaseRadius } from "./rings";
import { HERO_TAG_FONT, HERO_TAG_MIN_SCALE, MONSTER_TAG_FONT, heroTagText, tagRect } from "./tags";

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
 * - No figure covers another one or its name tag. Each figure takes up two
 *   boxes (figureShape): its mini with its base, and its tag. The solver keeps
 *   all of them apart, preferring side by side (SIDEWAYS).
 */

/** Strength of the spring that holds a monster or an idle hero to its home. */
export const ANCHOR = 0.03;
/** Strength of the spring between a hero and its main target. */
export const MAIN_PULL = 0.6;
/** Strength of the spring between a hero and each secondary target. */
export const SECONDARY_PULL = 0.2;
/** Space between the bases of a hero and its main target (room for the arrow). */
export const MAIN_GAP = 56;
/** Space between the bases of a hero and a secondary target. */
export const SECONDARY_GAP = 96;
/** Least space between a hero (its mini and tag) and each of its targets, so every arrow shows on the felt. */
export const ARROW_ROOM = 50;
/**
 * Name tags keep TAG_MIN_PX on screen when zoomed out, so they grow in world
 * units. The layout keeps room for them as they are drawn at this zoom.
 */
export const TAG_ROOM_SCALE = 0.8;
/**
 * How much the solver prefers pushing two figures apart side by side over
 * one above the other. Minis are tall and their tags hang below them, so side
 * by side keeps both in view and leaves the arrows on open felt.
 */
export const SIDEWAYS = 1.6;
/** How far from the middle of its targets' homes an engaged hero starts, so heroes that share targets never start on one point. */
const START_SPREAD = 12;
/** An engaged hero starts beside the middle of its targets, at most this far (radians) above or below level. */
const START_TILT = 0.5;

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
  /**
   * An earlier layout to start every figure from (where it was drawn there),
   * with `iterations` and `settle` passed on to the solver. A live drag uses
   * it to lay the map out again on every pointer move in far fewer steps.
   */
  from?: WorldLayout;
  iterations?: number;
  settle?: number;
};

/** What a figure covers on the table, in world units: its body (the mini with its base) and its name tag. */
export type FigureShape = { body: Rect; tag: Rect };

/**
 * The shape of a figure standing at `pos` on a base of `radius`, with its tag
 * drawn at zoom `scale`. The body is the box around the mini's silhouette and
 * its base ellipse.
 */
export function figureShape(
  mini: Mini,
  pos: Pos,
  radius: number,
  tag: { text: string; size: number },
  scale: number = TAG_ROOM_SCALE,
): FigureShape {
  const model = miniBodyRect(mini, pos, radius);
  const x0 = Math.min(model.x, pos.x - radius);
  const y0 = Math.min(model.y, pos.y - radius * BASE_SQUASH);
  const x1 = Math.max(model.x + model.width, pos.x + radius);
  const y1 = Math.max(model.y + model.height, pos.y + radius * BASE_SQUASH);
  return {
    body: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    tag: tagRect(pos, radius, tag.text, tag.size, scale),
  };
}

/** A monster's shape where it is placed. */
export function monsterShape(m: PlacedMonster, scale?: number): FigureShape {
  return figureShape(monsterMini(m.monster), m.pos, m.radius, { text: m.monster.name, size: MONSTER_TAG_FONT }, scale);
}

/** A hero's shape where it is placed. Its tag reads "· idle" while it has no targets. */
export function heroShape(h: PlacedHero, scale?: number): FigureShape {
  return figureShape(
    heroMini(h.hero.mini),
    h.pos,
    HERO_BASE_RADIUS,
    { text: heroTagText(h.hero.name, h.targets.length === 0), size: HERO_TAG_FONT },
    scale,
  );
}

const SIZE_RANK = { XL: 0, L: 1, M: 2, S: 3 } as const;

/**
 * Which name tags to draw at zoom `scale`, by figure key (`monster:<id>` or
 * `hero:<id>`). The layout keeps room for tags as they are drawn at
 * TAG_ROOM_SCALE; further out they grow in world units and would cover each
 * other, so a tag that would overlap one already shown is left out until you
 * zoom in. The `first` figure (say, the selected one) always keeps its tag;
 * then come unfought monsters, the other monsters from the largest down, and
 * heroes, whose tags are hidden altogether below HERO_TAG_MIN_SCALE. Ties go
 * by key.
 */
export function shownTags(layout: WorldLayout, scale: number, first: string | null = null): Set<string> {
  const candidates = [
    ...layout.monsters.map((m) => ({
      key: `monster:${m.monster.id}`,
      rank: m.unfought ? 0 : 1 + SIZE_RANK[m.monster.size],
      tag: monsterShape(m, scale).tag,
    })),
    ...(scale >= HERO_TAG_MIN_SCALE
      ? layout.heroes.map((h) => ({ key: `hero:${h.hero.id}`, rank: 5, tag: heroShape(h, scale).tag }))
      : []),
  ]
    .map((c) => (c.key === first ? { ...c, rank: -1 } : c))
    .sort((a, b) => a.rank - b.rank || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const kept: Rect[] = [];
  const shown = new Set<string>();
  for (const c of candidates) {
    const t = c.tag;
    if (kept.some((k) => t.x < k.x + k.width && k.x < t.x + t.width && t.y < k.y + k.height && k.y < t.y + t.height)) continue;
    kept.push(t);
    shown.add(c.key);
  }
  return shown;
}

/** A shape's boxes as offsets from the point the figure stands on, for the solver. */
function nodeBoxes({ body, tag }: FigureShape, at: Pos): ForceBox[] {
  return [body, tag].map((r) => ({ x: r.x - at.x, y: r.y - at.y, width: r.width, height: r.height }));
}

/** Where an idle hero is held: its `pos`, or the origin if it has none. */
export function idleHome(hero: Hero): Pos {
  return hero.pos ?? { x: 0, y: 0 };
}

const monsterNode = (id: string) => `m:${id}`;
const heroNode = (id: string) => `h:${id}`;
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Places every living monster and every hero. Pure: the same world (and
 * options) always gives the same layout, whatever order the files list things
 * in. Without `from`, every figure starts from its home, never from an earlier
 * picture, so a figure that was nudged aside is drawn back at home once there
 * is room.
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
  /** Where each figure was drawn in `from`, by solver node id. */
  const earlier = new Map<string, Pos>([
    ...(opts.from?.monsters ?? []).map((m) => [monsterNode(m.monster.id), m.pos] as const),
    ...(opts.from?.heroes ?? []).map((h) => [heroNode(h.hero.id), h.pos] as const),
  ]);

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
    nodes.push({
      id: monsterNode(m.monster.id),
      boxes: nodeBoxes(monsterShape(m), m.pos),
      start: (m.monster.id !== pin?.id && earlier.get(monsterNode(m.monster.id))) || starts.get(m.monster.id)!,
      pinned: m.monster.id === pin?.id,
      anchor: { pos: m.monster.pos, strength: ANCHOR },
    });
  }
  const radii = new Map(monsters.map((m) => [m.monster.id, m.radius]));
  for (const h of [...heroes].sort((a, b) => byId(a.hero, b.hero))) {
    const id = heroNode(h.hero.id);
    const boxes = nodeBoxes(heroShape(h), h.pos);
    if (h.targets.length === 0) {
      const home = idleHome(h.hero);
      nodes.push({ id, boxes, start: earlier.get(id) ?? home, anchor: { pos: home, strength: ANCHOR } });
      continue;
    }
    nodes.push({ id, boxes, start: earlier.get(id) ?? engagedStart(h.hero.id, h.targets.map((t) => starts.get(t)!)) });
    h.targets.forEach((target, i) => {
      const main = i === 0;
      links.push({
        source: id,
        target: monsterNode(target),
        length: radii.get(target)! + HERO_BASE_RADIUS + (main ? MAIN_GAP : SECONDARY_GAP),
        strength: main ? MAIN_PULL : SECONDARY_PULL,
        clearance: ARROW_ROOM,
      });
    });
  }

  const out = relax(nodes, links, { sideways: SIDEWAYS, iterations: opts.iterations, settle: opts.settle });
  for (const m of monsters) m.pos = out.get(monsterNode(m.monster.id))!;
  for (const h of heroes) h.pos = out.get(heroNode(h.hero.id))!;
  return { monsters, heroes };
}

/**
 * The middle of where an engaged hero's targets start, moved a little to the
 * left or right (and slightly up or down) in a direction set by its id, so a
 * hero with one target settles beside it rather than above or below it.
 */
function engagedStart(heroId: string, targets: Pos[]): Pos {
  const x = targets.reduce((sum, p) => sum + p.x, 0) / targets.length;
  const y = targets.reduce((sum, p) => sum + p.y, 0) / targets.length;
  const h = fnv1a(heroId) / 0x100000000;
  const side = h < 0.5 ? 0 : Math.PI;
  const angle = side + ((h * 2) % 1 - 0.5) * 2 * START_TILT;
  return { x: x + START_SPREAD * Math.cos(angle), y: y + START_SPREAD * Math.sin(angle) };
}

/** Points the opening view should fit: the corners of every figure's body and tag, for every living monster and every hero. */
export function openingPoints(layout: WorldLayout): Pos[] {
  const shapes = [...layout.monsters.map((m) => monsterShape(m)), ...layout.heroes.map((h) => heroShape(h))];
  return shapes.flatMap(({ body, tag }) =>
    [body, tag].flatMap((r) => [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y + r.height },
    ]),
  );
}
