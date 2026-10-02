import type { Pos } from "@/lib/types";
import { labelBox, type WorldLayout } from "./layout";
import { HERO_BASE_RADIUS } from "./rings";

/*
 * The terrain of the felt table, worked out from world coordinates alone.
 *
 * The world is cut into square chunks. `terrainChunk(cx, cy)` is pure: the same
 * chunk always gives the same terrain, and nothing about it is stored. Anything
 * that spans chunks (biomes, hills, roads, rivers) comes from a function of the
 * world position, so neighbouring chunks agree at their shared border.
 *
 * Terrain is decoration only. It never affects the layout or hit-testing.
 */

/** Side of one terrain chunk, in world units. */
export const CHUNK_SIZE = 1200;
/** Ground samples per chunk side, minus one. The ground colour and the hills are sampled on this grid. */
export const GROUND_CELLS = 30;
const STEP = CHUNK_SIZE / GROUND_CELLS;

/** Width of a dirt road, in world units. */
export const ROAD_WIDTH = 30;
/** Width of a river, in world units. */
export const RIVER_WIDTH = 64;
/** Raised pieces in one chunk are at least this far apart (and as far from pieces in other chunks). */
export const PIECE_SPACING = 300;
/** At most this many raised pieces stand in one chunk. */
export const MAX_PIECES = 2;
/** A raised piece that a figure or label overlaps is drawn at this opacity. */
export const COVERED_OPACITY = 0.35;
/** Below this zoom, scatter is left out; ground features and raised pieces stay. */
export const SCATTER_MIN_SCALE = 0.4;
/** The grid is fully visible at and above this zoom, and fades out below it. */
export const GRID_FULL_SCALE = 0.6;
/** The grid is gone at and below this zoom. */
export const GRID_GONE_SCALE = 0.45;
/** sin 38°: how much the three-quarter view squashes a circle on the table. */
export const TABLE_SQUASH = Math.sin((38 * Math.PI) / 180);

export type Biome = "meadow" | "woods" | "highlands" | "marsh";
/** Every biome, in the order `biomeWeights` reports them. */
export const BIOMES: readonly Biome[] = ["meadow", "woods", "highlands", "marsh"];
/** How much of each biome is at a point, in `BIOMES` order. Sums to 1. */
export type BiomeWeights = [number, number, number, number];

export type ScatterKind =
  | "rock"
  | "pebbles"
  | "tuft"
  | "dryTuft"
  | "flowers"
  | "log"
  | "reeds"
  | "bush"
  | "autumnBush"
  | "leaves"
  | "puddle";

export type Scatter = {
  kind: ScatterKind;
  x: number;
  y: number;
  scale: number;
  variant: number;
  flip: boolean;
};

export type PieceKind = "woods" | "ruins" | "watchtower" | "camp" | "stones";

export type RaisedPiece = {
  kind: PieceKind;
  /** The biome it stands in, which picks its colours (e.g. autumn trees). */
  biome: Biome;
  /** Centre of its footprint on the table. */
  x: number;
  y: number;
  variant: number;
  flip: boolean;
  /** Radius of its footprint, in world units. */
  radius: number;
  /** How far it rises above its footprint centre on screen, in world units. */
  height: number;
};

export type Bridge = { x: number; y: number; /** Direction of the road, in radians. */ angle: number };

export type Polyline = Pos[];

export type TerrainChunk = {
  cx: number;
  cy: number;
  /** The biome at the chunk's centre. */
  biome: Biome;
  /**
   * Ground colour sampled on a (GROUND_CELLS + 1)² grid from the chunk's top-left
   * corner to its bottom-right corner, row by row, three bytes (RGB) per sample.
   * Border samples are shared with the neighbouring chunks.
   */
  ground: Uint8Array;
  /** SVG path data for the hill contour lines. */
  contours: string;
  roads: Polyline[];
  rivers: Polyline[];
  bridges: Bridge[];
  scatter: Scatter[];
  pieces: RaisedPiece[];
};

export type Box = { x0: number; y0: number; x1: number; y1: number };

/** The area a figure and its label cover, and the y its base stands at. */
export type FigureFootprint = { box: Box; y: number };

/* ------------------------------------------------------------------------ */
/* Hashing and noise                                                        */
/* ------------------------------------------------------------------------ */

/** Separate streams of randomness, so each feature has its own noise. */
const Seed = {
  Biome: 11,
  CellX: 12,
  CellY: 13,
  WarpX: 14,
  WarpY: 15,
  Hill: 16,
  Mottle: 17,
  Wet: 18,
  Rust: 19,
  RoadNodeX: 20,
  RoadNodeY: 21,
  RoadEast: 22,
  RoadSouth: 23,
  RoadBendA: 24,
  RoadBendB: 25,
  River: 26,
  Chunk: 27,
} as const;

/** A well-mixed hash of three integers, in [0, 1). */
function hash(a: number, b: number, c: number): number {
  let h = 0x6a09e667 ^ Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b9);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A small seeded generator (mulberry32), for choices made inside one chunk. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise on the integer lattice, in [0, 1]. */
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal value noise, in [0, 1]. */
function fbm(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * f, y * f, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------------ */
/* Biomes and hills                                                         */
/* ------------------------------------------------------------------------ */

/** Biomes come in regions around jittered points of a lattice this wide. */
const BIOME_CELL = 2400;
/** How wide the blend between two biomes is (larger = softer). */
const BIOME_BLEND = 110;
/** How far the biome borders wander, in world units. */
const BIOME_WARP = 900;

function cellBiome(i: number, j: number): number {
  // The region around the origin is meadow, so the opening view starts on open grass.
  if (i === 0 && j === 0) return 0;
  const r = hash(i, j, Seed.Biome);
  return r < 0.34 ? 0 : r < 0.62 ? 1 : r < 0.8 ? 2 : 3;
}

/** The point a biome region grows around. The origin's region grows around the origin itself. */
function cellCentre(i: number, j: number): [number, number] {
  if (i === 0 && j === 0) return [0, 0];
  return [(i - 0.3 + 0.6 * hash(i, j, Seed.CellX)) * BIOME_CELL, (j - 0.3 + 0.6 * hash(i, j, Seed.CellY)) * BIOME_CELL];
}

const scratchDist = new Float64Array(9);
const scratchBiome = new Uint8Array(9);

/** How much of each biome is at a world point. Changes slowly and continuously across the map. */
export function biomeWeights(x: number, y: number): BiomeWeights {
  const wx = x + (fbm(x / 1500, y / 1500, Seed.WarpX, 2) - 0.5) * BIOME_WARP * 2;
  const wy = y + (fbm(x / 1500, y / 1500, Seed.WarpY, 2) - 0.5) * BIOME_WARP * 2;
  // Cell (i, j) spans [i - 0.5, i + 0.5) cells, so cell (0, 0) is centred on the origin.
  const ci = Math.floor(wx / BIOME_CELL + 0.5);
  const cj = Math.floor(wy / BIOME_CELL + 0.5);
  let min = Infinity;
  let k = 0;
  for (let j = cj - 1; j <= cj + 1; j++) {
    for (let i = ci - 1; i <= ci + 1; i++, k++) {
      const [px, py] = cellCentre(i, j);
      const d = Math.sqrt((wx - px) * (wx - px) + (wy - py) * (wy - py));
      scratchDist[k] = d;
      scratchBiome[k] = cellBiome(i, j);
      if (d < min) min = d;
    }
  }
  const w: BiomeWeights = [0, 0, 0, 0];
  let total = 0;
  for (k = 0; k < 9; k++) {
    const e = Math.exp(-(scratchDist[k] - min) / BIOME_BLEND);
    w[scratchBiome[k]] += e;
    total += e;
  }
  for (k = 0; k < 4; k++) w[k] /= total;
  return w;
}

/** The biome with the most weight at a world point. */
export function biomeAt(x: number, y: number): Biome {
  return BIOMES[strongest(biomeWeights(x, y))];
}

function strongest(w: BiomeWeights): number {
  let best = 0;
  for (let k = 1; k < 4; k++) if (w[k] > w[best]) best = k;
  return best;
}

/** How hilly each biome is, in `BIOMES` order. */
const HILLINESS: BiomeWeights = [0.8, 0.6, 1.3, 0.12];
/** Heights at which contour lines are drawn. */
const CONTOUR_LEVELS = [0.18, 0.42, 0.66, 0.9];

/** Height of the hills at a world point: 0 on the flat, up to about 1.3 on highland tops. */
export function hillHeight(x: number, y: number, w: BiomeWeights = biomeWeights(x, y)): number {
  const n = fbm(x / 850, y / 850, Seed.Hill, 3);
  const hilly = w[0] * HILLINESS[0] + w[1] * HILLINESS[1] + w[2] * HILLINESS[2] + w[3] * HILLINESS[3];
  return smoothstep(0.5, 0.78, n) * hilly;
}

/** Felt tint of each biome, in `BIOMES` order. */
const FELT: [number, number, number][] = [
  [78, 108, 58], // meadow: the classic green felt
  [96, 92, 46], // autumn woods: olive turning to ochre
  [101, 106, 86], // rocky highlands: grey-green
  [55, 84, 66], // marsh: dark teal-green
];
const WET: [number, number, number] = [36, 60, 58];
const RUST: [number, number, number] = [124, 82, 38];
const SUN: [number, number, number] = [196, 196, 128];

function groundColour(x: number, y: number, w: BiomeWeights, h: number, out: Uint8Array, at: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let k = 0; k < 4; k++) {
    r += FELT[k][0] * w[k];
    g += FELT[k][1] * w[k];
    b += FELT[k][2] * w[k];
  }
  // Wet hollows in the marsh, rust-coloured leaf beds in the woods.
  const wet = w[3] < 0.01 ? 0 : w[3] * smoothstep(0.52, 0.68, fbm(x / 340, y / 340, Seed.Wet, 2)) * 0.75;
  r += (WET[0] - r) * wet;
  g += (WET[1] - g) * wet;
  b += (WET[2] - b) * wet;
  const rust = w[1] < 0.01 ? 0 : w[1] * smoothstep(0.5, 0.7, fbm(x / 420, y / 420, Seed.Rust, 2)) * 0.6;
  r += (RUST[0] - r) * rust;
  g += (RUST[1] - g) * rust;
  b += (RUST[2] - b) * rust;
  // Hill tops catch the lamp light.
  const sun = Math.min(1, h) * 0.4;
  r += (SUN[0] - r) * sun;
  g += (SUN[1] - g) * sun;
  b += (SUN[2] - b) * sun;
  // Uneven dye, as on real felt.
  const m = 1 + (fbm(x / 230, y / 230, Seed.Mottle, 2) - 0.5) * 0.2;
  out[at] = Math.max(0, Math.min(255, Math.round(r * m)));
  out[at + 1] = Math.max(0, Math.min(255, Math.round(g * m)));
  out[at + 2] = Math.max(0, Math.min(255, Math.round(b * m)));
}

/* ------------------------------------------------------------------------ */
/* Contours (marching squares)                                              */
/* ------------------------------------------------------------------------ */

const r1 = (v: number) => Math.round(v * 10) / 10;

function contourPath(heights: Float64Array, x0: number, y0: number): string {
  const n = GROUND_CELLS + 1;
  const parts: string[] = [];
  const seg = (ax: number, ay: number, bx: number, by: number) =>
    parts.push(`M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}`);
  for (const level of CONTOUR_LEVELS) {
    for (let j = 0; j < GROUND_CELLS; j++) {
      for (let i = 0; i < GROUND_CELLS; i++) {
        const a = heights[j * n + i];
        const b = heights[j * n + i + 1];
        const c = heights[(j + 1) * n + i + 1];
        const d = heights[(j + 1) * n + i];
        const code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const x = x0 + i * STEP;
        const y = y0 + j * STEP;
        // Crossing points on the top, right, bottom and left edges of the cell.
        const top = () => [x + STEP * ((level - a) / (b - a)), y] as const;
        const right = () => [x + STEP, y + STEP * ((level - b) / (c - b))] as const;
        const bottom = () => [x + STEP * ((level - d) / (c - d)), y + STEP] as const;
        const left = () => [x, y + STEP * ((level - a) / (d - a))] as const;
        const line = (p: readonly [number, number], q: readonly [number, number]) => seg(p[0], p[1], q[0], q[1]);
        const centreHigh = (a + b + c + d) / 4 > level;
        switch (code) {
          case 1: case 14: line(left(), bottom()); break;
          case 2: case 13: line(bottom(), right()); break;
          case 3: case 12: line(left(), right()); break;
          case 4: case 11: line(top(), right()); break;
          case 6: case 9: line(top(), bottom()); break;
          case 7: case 8: line(left(), top()); break;
          case 5:
            if (centreHigh) { line(left(), top()); line(bottom(), right()); }
            else { line(left(), bottom()); line(top(), right()); }
            break;
          case 10:
            if (centreHigh) { line(left(), bottom()); line(top(), right()); }
            else { line(left(), top()); line(bottom(), right()); }
            break;
        }
      }
    }
  }
  return parts.join("");
}

/* ------------------------------------------------------------------------ */
/* Roads and rivers                                                         */
/* ------------------------------------------------------------------------ */

/** Road junctions sit at jittered points of a lattice this wide. */
const ROAD_CELL = 2800;
/** Distance between the points a road is sampled at. */
const ROAD_SAMPLE = 36;

function roadNode(i: number, j: number): Pos {
  return {
    x: (i + 0.2 + 0.6 * hash(i, j, Seed.RoadNodeX)) * ROAD_CELL,
    y: (j + 0.2 + 0.6 * hash(i, j, Seed.RoadNodeY)) * ROAD_CELL,
  };
}

/** The four control points of the road from junction (i, j) to its east or south neighbour, or null if there is no road. */
function roadCurve(i: number, j: number, east: boolean): [Pos, Pos, Pos, Pos] | null {
  if (hash(i, j, east ? Seed.RoadEast : Seed.RoadSouth) >= (east ? 0.62 : 0.5)) return null;
  const a = roadNode(i, j);
  const b = east ? roadNode(i + 1, j) : roadNode(i, j + 1);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const s = east ? Seed.RoadBendA : Seed.RoadBendB;
  const o1 = (hash(i, j, s) - 0.5) * 0.6 * len;
  const o2 = (hash(i, j, s + 50) - 0.5) * 0.6 * len;
  return [
    a,
    { x: a.x + dx / 3 + nx * o1, y: a.y + dy / 3 + ny * o1 },
    { x: a.x + (2 * dx) / 3 + nx * o2, y: a.y + (2 * dy) / 3 + ny * o2 },
    b,
  ];
}

function sampleCubic([a, b, c, d]: [Pos, Pos, Pos, Pos]): Pos[] {
  // The curve is longer than its chord, so sample a little more often than the chord needs.
  const n = Math.max(2, Math.ceil((Math.hypot(d.x - a.x, d.y - a.y) / ROAD_SAMPLE) * 1.3));
  const pts: Pos[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const u = 1 - t;
    pts.push({
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    });
  }
  return pts;
}

/** Rivers run north to south, one in each band of the world this wide. */
const RIVER_BAND = 7200;
/** Distance between the points a river is sampled at, along y. */
const RIVER_SAMPLE = 40;

/** Where river `k` crosses height y. The river nearest the origin passes just east of it. */
function riverX(k: number, y: number): number {
  const base = k === 0 ? 1000 : (k + 0.15 + 0.5 * hash(k, 0, Seed.River)) * RIVER_BAND;
  const p1 = hash(k, 1, Seed.River) * 6.283;
  const p2 = hash(k, 2, Seed.River) * 6.283;
  const p3 = hash(k, 3, Seed.River) * 6.283;
  const bend = (t: number) => 560 * Math.sin(t / 1900 + p1) + 240 * Math.sin(t / 690 + p2) + 80 * Math.sin(t / 250 + p3);
  return base + bend(y) - bend(0);
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

/**
 * Cuts a polyline into the runs that lie inside `rect`. Points where a run
 * crosses the border are computed only from the segment and the border line, so
 * the neighbouring chunk computes exactly the same point.
 */
function clipPolyline(pts: Pos[], rect: Rect, out: Polyline[]) {
  let run: Pos[] | null = null;
  for (let k = 0; k + 1 < pts.length; k++) {
    const seg = clipSegment(pts[k], pts[k + 1], rect);
    if (!seg) {
      if (run) out.push(run);
      run = null;
      continue;
    }
    const [p, q, enteredInside, leftInside] = seg;
    if (!run || !enteredInside) {
      if (run) out.push(run);
      run = [p];
    }
    run.push(q);
    if (!leftInside) {
      out.push(run);
      run = null;
    }
  }
  if (run) out.push(run);
}

/** Liang-Barsky. Returns the clipped segment and whether each end is the original (inside) point. */
function clipSegment(a: Pos, b: Pos, r: Rect): [Pos, Pos, boolean, boolean] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  let e0: "x0" | "x1" | "y0" | "y1" | null = null;
  let e1: "x0" | "x1" | "y0" | "y1" | null = null;
  const edges: [number, number, "x0" | "x1" | "y0" | "y1"][] = [
    [-dx, a.x - r.x0, "x0"],
    [dx, r.x1 - a.x, "x1"],
    [-dy, a.y - r.y0, "y0"],
    [dy, r.y1 - a.y, "y1"],
  ];
  for (const [p, q, edge] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return null;
      if (t > t0) {
        t0 = t;
        e0 = edge;
      }
    } else {
      if (t < t0) return null;
      if (t < t1) {
        t1 = t;
        e1 = edge;
      }
    }
  }
  if (t0 >= t1) return null;
  const at = (t: number, edge: typeof e0): Pos => {
    if (edge === null) return t === 0 ? a : b;
    // Snap onto the border line exactly; the other coordinate comes from the border value alone.
    if (edge === "x0" || edge === "x1") {
      const X = r[edge];
      return { x: X, y: a.y + ((X - a.x) / dx) * dy };
    }
    const Y = r[edge];
    return { x: a.x + ((Y - a.y) / dy) * dx, y: Y };
  };
  return [at(0, e0), at(1, e1), e0 === null, e1 === null];
}

function segmentDistance(p: Pos, a: Pos, b: Pos): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  const ex = p.x - (a.x + t * dx);
  const ey = p.y - (a.y + t * dy);
  return Math.sqrt(ex * ex + ey * ey);
}

function distanceToLines(p: Pos, lines: Polyline[]): number {
  let best = Infinity;
  for (const line of lines) {
    for (let k = 0; k + 1 < line.length; k++) {
      const d = segmentDistance(p, line[k], line[k + 1]);
      if (d < best) best = d;
    }
  }
  return best;
}

function intersect(a: Pos, b: Pos, c: Pos, d: Pos): Pos | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (den === 0) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * rx, y: a.y + t * ry };
}

/* ------------------------------------------------------------------------ */
/* Scatter and raised pieces                                                */
/* ------------------------------------------------------------------------ */

/** Scatter candidates sit on a jittered grid with this many cells per chunk side. */
const SCATTER_CELLS = 17;

/** For each biome: the chance a scatter candidate is used, and which kinds it picks from (with weights). */
const SCATTER: Record<Biome, { density: number; kinds: [ScatterKind, number][] }> = {
  meadow: { density: 0.24, kinds: [["tuft", 5], ["flowers", 3], ["rock", 1], ["bush", 1.2], ["pebbles", 1]] },
  woods: { density: 0.32, kinds: [["leaves", 4], ["autumnBush", 3], ["log", 1.4], ["tuft", 1], ["rock", 0.8], ["bush", 0.6]] },
  highlands: { density: 0.3, kinds: [["rock", 5], ["pebbles", 3], ["dryTuft", 2.5], ["bush", 0.4]] },
  marsh: { density: 0.28, kinds: [["reeds", 6], ["tuft", 2], ["puddle", 1.6], ["log", 0.8]] },
};

const PIECE_SIZE: Record<PieceKind, { radius: number; height: number }> = {
  woods: { radius: 125, height: 150 },
  ruins: { radius: 100, height: 105 },
  watchtower: { radius: 60, height: 230 },
  camp: { radius: 80, height: 75 },
  stones: { radius: 90, height: 90 },
};

/** Which raised pieces each biome offers, with weights. */
const PIECES: Record<Biome, [PieceKind, number][]> = {
  meadow: [["woods", 3], ["camp", 2], ["stones", 1.5], ["ruins", 1], ["watchtower", 1]],
  woods: [["woods", 5], ["camp", 1.5], ["ruins", 1]],
  highlands: [["watchtower", 2], ["stones", 2], ["ruins", 2], ["woods", 1.5]],
  marsh: [["ruins", 2], ["woods", 2], ["stones", 1]],
};

/** Raised pieces keep this far from the chunk border, so pieces in neighbouring chunks are PIECE_SPACING apart too. */
const PIECE_MARGIN = PIECE_SPACING / 2 + 10;

function pick<T>(options: [T, number][], r: number): T {
  let total = 0;
  for (const [, w] of options) total += w;
  let x = r * total;
  for (const [v, w] of options) {
    x -= w;
    if (x < 0) return v;
  }
  return options[options.length - 1][0];
}

function pickBiome(w: BiomeWeights, r: number): Biome {
  let x = r;
  for (let k = 0; k < 4; k++) {
    x -= w[k];
    if (x < 0) return BIOMES[k];
  }
  return BIOMES[3];
}

/* ------------------------------------------------------------------------ */
/* The chunk                                                                */
/* ------------------------------------------------------------------------ */

/** Which chunk a world point is in. */
export function chunkOf(p: Pos): { cx: number; cy: number } {
  return { cx: Math.floor(p.x / CHUNK_SIZE), cy: Math.floor(p.y / CHUNK_SIZE) };
}

/** The terrain of chunk (cx, cy), which covers [cx, cx + 1) × [cy, cy + 1) chunk sizes. Pure. */
export function terrainChunk(cx: number, cy: number): TerrainChunk {
  const x0 = cx * CHUNK_SIZE;
  const y0 = cy * CHUNK_SIZE;
  const rect: Rect = { x0, y0, x1: (cx + 1) * CHUNK_SIZE, y1: (cy + 1) * CHUNK_SIZE };
  const n = GROUND_CELLS + 1;

  // Ground colour and hills on the shared sample grid. Biomes change slowly, so
  // they are worked out on every other sample and blended in between.
  const ground = new Uint8Array(n * n * 3);
  const heights = new Float64Array(n * n);
  const weights: BiomeWeights[] = new Array(n * n);
  // Border samples are computed from the border coordinate itself, so both chunks get the same value.
  const sx = (i: number) => (i === GROUND_CELLS ? rect.x1 : x0 + i * STEP);
  const sy = (j: number) => (j === GROUND_CELLS ? rect.y1 : y0 + j * STEP);
  for (let j = 0; j < n; j += 2) {
    for (let i = 0; i < n; i += 2) weights[j * n + i] = biomeWeights(sx(i), sy(j));
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (i % 2 === 0 && j % 2 === 0) continue;
      const i0 = i - (i % 2);
      const j0 = j - (j % 2);
      const i1 = i % 2 ? i + 1 : i;
      const j1 = j % 2 ? j + 1 : j;
      const a = weights[j0 * n + i0];
      const b = weights[j0 * n + i1];
      const c = weights[j1 * n + i0];
      const d = weights[j1 * n + i1];
      weights[j * n + i] = [
        (a[0] + b[0] + c[0] + d[0]) / 4,
        (a[1] + b[1] + c[1] + d[1]) / 4,
        (a[2] + b[2] + c[2] + d[2]) / 4,
        (a[3] + b[3] + c[3] + d[3]) / 4,
      ];
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = sx(i);
      const y = sy(j);
      const w = weights[j * n + i];
      const h = hillHeight(x, y, w);
      heights[j * n + i] = h;
      groundColour(x, y, w, h, ground, (j * n + i) * 3);
    }
  }
  const contours = contourPath(heights, x0, y0);

  // Roads from the junction lattice.
  const roads: Polyline[] = [];
  const ri0 = Math.floor(rect.x0 / ROAD_CELL) - 2;
  const ri1 = Math.floor(rect.x1 / ROAD_CELL) + 1;
  const rj0 = Math.floor(rect.y0 / ROAD_CELL) - 2;
  const rj1 = Math.floor(rect.y1 / ROAD_CELL) + 1;
  for (let j = rj0; j <= rj1; j++) {
    for (let i = ri0; i <= ri1; i++) {
      for (const east of [true, false]) {
        const curve = roadCurve(i, j, east);
        if (!curve || !boundsTouch(curve, rect)) continue;
        clipPolyline(sampleCubic(curve), rect, roads);
      }
    }
  }

  // Rivers from their bands.
  const rivers: Polyline[] = [];
  const kMid = Math.floor((x0 + CHUNK_SIZE / 2) / RIVER_BAND);
  for (let k = kMid - 1; k <= kMid + 1; k++) {
    const first = Math.floor(rect.y0 / RIVER_SAMPLE) - 1;
    const last = Math.ceil(rect.y1 / RIVER_SAMPLE) + 1;
    const pts: Pos[] = [];
    let near = false;
    for (let s = first; s <= last; s++) {
      const y = s * RIVER_SAMPLE;
      const x = riverX(k, y);
      if (x > rect.x0 - 100 && x < rect.x1 + 100) near = true;
      pts.push({ x, y });
    }
    if (near) clipPolyline(pts, rect, rivers);
  }

  // A stone bridge wherever a road crosses a river. The chunk that holds the crossing owns it.
  const bridges: Bridge[] = [];
  for (const road of roads) {
    for (let a = 0; a + 1 < road.length; a++) {
      for (const river of rivers) {
        for (let b = 0; b + 1 < river.length; b++) {
          const p = intersect(road[a], road[a + 1], river[b], river[b + 1]);
          if (!p || p.x >= rect.x1 || p.y >= rect.y1) continue;
          const angle = Math.atan2(road[a + 1].y - road[a].y, road[a + 1].x - road[a].x);
          bridges.push({ x: p.x, y: p.y, angle });
        }
      }
    }
  }

  const rand = rng(hash(cx, cy, Seed.Chunk) * 4294967296);
  const clearOf = (p: Pos, road: number, river: number) =>
    distanceToLines(p, roads) > ROAD_WIDTH / 2 + road && distanceToLines(p, rivers) > RIVER_WIDTH / 2 + river;

  // Raised pieces: zero to two, well apart and clear of roads and water.
  const pieces: RaisedPiece[] = [];
  const roll = rand();
  const wanted = roll < 0.4 ? 0 : roll < 0.82 ? 1 : MAX_PIECES;
  for (let tries = 0; tries < 14 && pieces.length < wanted; tries++) {
    const x = x0 + PIECE_MARGIN + rand() * (CHUNK_SIZE - 2 * PIECE_MARGIN);
    const y = y0 + PIECE_MARGIN + rand() * (CHUNK_SIZE - 2 * PIECE_MARGIN);
    const rKind = rand();
    const r2 = rand();
    const r3 = rand();
    const biome = biomeAt(x, y);
    const kind = pick(PIECES[biome], rKind);
    const { radius, height } = PIECE_SIZE[kind];
    if (pieces.some((p) => Math.hypot(p.x - x, p.y - y) < PIECE_SPACING)) continue;
    if (!clearOf({ x, y }, radius + 20, radius + 30)) continue;
    pieces.push({ kind, biome, x, y, variant: Math.floor(r2 * 3), flip: r3 < 0.5, radius, height });
  }

  // Scatter: a jittered grid, thinned by biome, clear of roads, water and raised pieces.
  const scatter: Scatter[] = [];
  const cells = SCATTER_CELLS;
  const cell = CHUNK_SIZE / cells;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const x = x0 + (i + 0.1 + 0.8 * rand()) * cell;
      const y = y0 + (j + 0.1 + 0.8 * rand()) * cell;
      const rUse = rand();
      const rBiome = rand();
      const rKind = rand();
      const rScale = rand();
      const rVar = rand();
      const p = { x, y };
      if (pieces.some((q) => Math.hypot(q.x - x, q.y - y) < q.radius + 10)) continue;
      const toRiver = distanceToLines(p, rivers) - RIVER_WIDTH / 2;
      if (toRiver < 6) continue;
      let kind: ScatterKind;
      if (toRiver < 40) {
        // Reeds line every riverbank.
        if (rUse > 0.55) continue;
        kind = "reeds";
      } else {
        const near = Math.round((y - y0) / STEP) * n + Math.round((x - x0) / STEP);
        const biome = pickBiome(weights[near], rBiome);
        const table = SCATTER[biome];
        if (rUse > table.density) continue;
        kind = pick(table.kinds, rKind);
      }
      if (distanceToLines(p, roads) < ROAD_WIDTH / 2 + 8) continue;
      scatter.push({ kind, x, y, scale: 0.8 + rScale * 0.45, variant: Math.floor(rVar * 3), flip: rVar * 3 - Math.floor(rVar * 3) < 0.5 });
    }
  }
  scatter.sort((a, b) => a.y - b.y);
  pieces.sort((a, b) => a.y - b.y);

  return {
    cx,
    cy,
    biome: biomeAt(x0 + CHUNK_SIZE / 2, y0 + CHUNK_SIZE / 2),
    ground,
    contours,
    roads,
    rivers,
    bridges,
    scatter,
    pieces,
  };
}

function boundsTouch(pts: Pos[], r: Rect): boolean {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return maxX >= r.x0 && minX <= r.x1 && maxY >= r.y0 && minY <= r.y1;
}

/** Every chunk that touches `area` grown by `margin` on each side, top row first. */
export function chunksIn(area: { x: number; y: number; width: number; height: number }, margin = 0) {
  const out: { cx: number; cy: number }[] = [];
  const cx0 = Math.floor((area.x - margin) / CHUNK_SIZE);
  const cx1 = Math.floor((area.x + area.width + margin) / CHUNK_SIZE);
  const cy0 = Math.floor((area.y - margin) / CHUNK_SIZE);
  const cy1 = Math.floor((area.y + area.height + margin) / CHUNK_SIZE);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) out.push({ cx, cy });
  return out;
}

/* ------------------------------------------------------------------------ */
/* What terrain must not hide                                               */
/* ------------------------------------------------------------------------ */

/** How tall a mini stands above its base centre, in base radii. */
const MINI_HEIGHT = 2.8;

/** The area a raised piece covers on screen, in world units. */
export function pieceBox(p: RaisedPiece): Box {
  return {
    x0: p.x - p.radius * 1.1,
    x1: p.x + p.radius * 1.1,
    y0: p.y - p.height,
    y1: p.y + p.radius * TABLE_SQUASH + 12,
  };
}

/** The area each figure and its name label cover, in world units: the mini standing on its base, and the label below or above it. */
export function figureBoxes(layout: WorldLayout): Box[] {
  const boxes: Box[] = [];
  for (const m of layout.monsters) {
    const r = m.radius;
    const label = labelBox(m.monster.name);
    const half = Math.max(r * 1.2, label.width / 2 + 10);
    boxes.push({
      x0: m.pos.x - half,
      x1: m.pos.x + half,
      y0: m.pos.y - r * MINI_HEIGHT,
      y1: m.pos.y + r + label.gap + label.height + 6,
    });
  }
  for (const h of layout.heroes) {
    const r = HERO_BASE_RADIUS;
    const half = Math.max(r * 1.4, h.hero.name.length * 4 + 12);
    boxes.push({
      x0: h.pos.x - half,
      x1: h.pos.x + half,
      y0: h.pos.y - r * MINI_HEIGHT - 24,
      y1: h.pos.y + r + 28,
    });
  }
  return boxes;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/**
 * How a raised piece is drawn among the figures. A piece nothing overlaps is
 * drawn under the figures at full strength. A piece that a figure or label
 * overlaps fades to COVERED_OPACITY; it stays under the figures when every
 * overlapping figure stands in front of it, and goes over them (faded) when
 * one stands behind it, so depth reads as it would on a real table.
 */
export function pieceDepth(piece: RaisedPiece, figures: FigureFootprint[]): {
  opacity: number;
  inFront: boolean;
} {
  const box = pieceBox(piece);
  let covered = false;
  let inFront = false;
  for (const f of figures) {
    if (!boxesOverlap(box, f.box)) continue;
    covered = true;
    if (f.y < piece.y) inFront = true;
  }
  return { opacity: covered ? COVERED_OPACITY : 1, inFront };
}

/** Figure boxes with the y each figure's base stands at, for `pieceDepth`. */
export function figureFootprints(layout: WorldLayout): FigureFootprint[] {
  const boxes = figureBoxes(layout);
  const ys = [...layout.monsters.map((m) => m.pos.y), ...layout.heroes.map((h) => h.pos.y)];
  return boxes.map((box, i) => ({ box, y: ys[i] }));
}

/** How visible the grid is at a zoom: 1 at and above GRID_FULL_SCALE, fading to 0 at GRID_GONE_SCALE. */
export function gridOpacity(scale: number): number {
  return smoothstep(GRID_GONE_SCALE, GRID_FULL_SCALE, scale);
}
