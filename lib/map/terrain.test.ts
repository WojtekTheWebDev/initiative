import { describe, expect, it } from "vitest";
import terrainArt from "@/public/terrain/manifest.json";
import type { Pos } from "@/lib/types";
import {
  BIOMES,
  CHUNK_SIZE,
  COVERED_OPACITY,
  GRID_FULL_SCALE,
  GRID_GONE_SCALE,
  MAX_PIECES,
  PIECE_SIZE,
  PIECE_SPACING,
  biomeAt,
  biomeWeights,
  chunksIn,
  gridOpacity,
  pieceBox,
  pieceDepth,
  terrainChunk,
  terrainSpot,
  type PieceKind,
  type Polyline,
  type RaisedPiece,
  type TerrainChunk,
} from "./terrain";

/** Chunks in a square of side `n` around the origin. */
function area(n: number): TerrainChunk[] {
  const out: TerrainChunk[] = [];
  const lo = -Math.floor(n / 2);
  for (let cy = lo; cy < lo + n; cy++) for (let cx = lo; cx < lo + n; cx++) out.push(terrainChunk(cx, cy));
  return out;
}

const AREA = area(10);
const at = (cx: number, cy: number) => AREA.find((c) => c.cx === cx && c.cy === cy)!;

type Side = "left" | "right" | "top" | "bottom";

/** The ends of every line in a chunk that lie on one side of its border. */
function borderEnds(chunk: TerrainChunk, lines: (c: TerrainChunk) => Polyline[], side: Side): Pos[] {
  const x0 = chunk.cx * CHUNK_SIZE;
  const y0 = chunk.cy * CHUNK_SIZE;
  const x1 = (chunk.cx + 1) * CHUNK_SIZE;
  const y1 = (chunk.cy + 1) * CHUNK_SIZE;
  const on = (p: Pos) =>
    side === "left" ? p.x === x0 : side === "right" ? p.x === x1 : side === "top" ? p.y === y0 : p.y === y1;
  const ends: Pos[] = [];
  for (const line of lines(chunk)) {
    for (const p of [line[0], line[line.length - 1]]) if (on(p)) ends.push(p);
  }
  const key = (p: Pos) => (side === "left" || side === "right" ? p.y : p.x);
  return ends.sort((a, b) => key(a) - key(b));
}

describe("terrainChunk", () => {
  it("gives the same terrain for the same chunk", () => {
    for (const [cx, cy] of [[0, 0], [3, -2], [-7, 5], [120, -340]]) {
      expect(terrainChunk(cx, cy)).toEqual(terrainChunk(cx, cy));
    }
  });

  it("gives different chunks different terrain", () => {
    expect(terrainChunk(1, 0).scatter).not.toEqual(terrainChunk(0, 0).scatter);
  });

  for (const [name, lines] of [
    ["roads", (c: TerrainChunk) => c.roads],
    ["rivers", (c: TerrainChunk) => c.rivers],
  ] as const) {
    it(`${name} leave one chunk exactly where they enter the next`, () => {
      let crossings = 0;
      for (const chunk of AREA) {
        if (chunk.cx + 1 < 5) {
          const right = borderEnds(chunk, lines, "right");
          expect(borderEnds(at(chunk.cx + 1, chunk.cy), lines, "left")).toEqual(right);
          crossings += right.length;
        }
        if (chunk.cy + 1 < 5) {
          const bottom = borderEnds(chunk, lines, "bottom");
          expect(borderEnds(at(chunk.cx, chunk.cy + 1), lines, "top")).toEqual(bottom);
          crossings += bottom.length;
        }
      }
      expect(crossings).toBeGreaterThan(5);
    });
  }

  it("shares the ground colour along chunk borders", () => {
    const a = terrainChunk(2, 1);
    const b = terrainChunk(3, 1);
    const n = 31;
    for (let j = 0; j < n; j++) {
      const right = [...a.ground.slice((j * n + n - 1) * 3, (j * n + n) * 3)];
      const left = [...b.ground.slice(j * n * 3, (j * n + 1) * 3)];
      expect(left).toEqual(right);
    }
  });

  it("puts a stone bridge where a road crosses a river", () => {
    const bridges = AREA.flatMap((c) => c.bridges);
    expect(bridges.length).toBeGreaterThan(0);
    for (const chunk of AREA) {
      for (const b of chunk.bridges) {
        const near = (lines: Polyline[]) =>
          lines.some((l) => l.some((p) => Math.hypot(p.x - b.x, p.y - b.y) < 60));
        expect(near(chunk.roads) && near(chunk.rivers)).toBe(true);
      }
    }
  });

  it("keeps raised pieces rare and at least PIECE_SPACING apart", () => {
    const all: RaisedPiece[] = [];
    let some = 0;
    for (const chunk of AREA) {
      expect(chunk.pieces.length).toBeLessThanOrEqual(MAX_PIECES);
      if (chunk.pieces.length > 0) some++;
      all.push(...chunk.pieces);
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)).toBeGreaterThanOrEqual(PIECE_SPACING);
      }
    }
    expect(some).toBeGreaterThan(20);
    expect(new Set(all.map((p) => p.kind)).size).toBe(5);
  });

  it("finds every biome within a 10 × 10 chunk area around the origin", () => {
    expect(new Set(AREA.map((c) => c.biome))).toEqual(new Set(BIOMES));
  });

  it("generates one chunk in under 2 ms", () => {
    const times: number[] = [];
    for (let k = 0; k < 25; k++) {
      const t = performance.now();
      terrainChunk(1000 + k, -500 + 3 * k);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(times.length / 2)]).toBeLessThan(2);
  });
});

describe("biomeWeights", () => {
  it("sums to one and changes smoothly", () => {
    for (let x = -6000; x <= 6000; x += 333) {
      const a = biomeWeights(x, 1234);
      const b = biomeWeights(x + 5, 1234);
      expect(a.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 9);
      for (let k = 0; k < 4; k++) expect(Math.abs(a[k] - b[k])).toBeLessThan(0.1);
    }
  });

  it("starts on meadow at the origin", () => {
    expect(biomeWeights(0, 0)[0]).toBeGreaterThan(0.5);
  });

  it("weighs one biome fully on a one-biome terrain", () => {
    for (const biome of BIOMES) {
      for (const [x, y] of [[0, 0], [5000, -3000], [-12000, 800]]) {
        const w = biomeWeights(x, y, biome);
        expect(w[BIOMES.indexOf(biome)]).toBe(1);
        expect(w.reduce((s, v) => s + v, 0)).toBe(1);
      }
    }
  });
});

describe("terrainChunk on one biome", () => {
  it("is made of that biome alone", () => {
    for (const biome of BIOMES) {
      const kinds = new Set<string>();
      for (let cy = -2; cy <= 2; cy++) {
        for (let cx = -2; cx <= 2; cx++) {
          const c = terrainChunk(cx, cy, biome);
          expect(c.biome).toBe(biome);
          for (const p of c.pieces) expect(p.biome).toBe(biome);
          for (const s of c.scatter) kinds.add(s.kind);
        }
      }
      kinds.delete("reeds"); // reeds line every riverbank
      const own: Record<string, string[]> = {
        meadow: ["tuft", "flowers", "rock", "bush", "pebbles"],
        woods: ["leaves", "autumnBush", "log", "tuft", "rock", "bush"],
        highlands: ["rock", "pebbles", "dryTuft", "bush"],
        marsh: ["tuft", "puddle", "log"],
      };
      for (const k of kinds) expect(own[biome], `${biome} ${k}`).toContain(k);
    }
  });

  it("keeps the same roads and rivers as the mixed terrain", () => {
    const mixed = terrainChunk(2, -1);
    const marsh = terrainChunk(2, -1, "marsh");
    expect(marsh.roads).toEqual(mixed.roads);
    expect(marsh.rivers).toEqual(mixed.rivers);
  });

  it("is the mixed terrain when none is given", () => {
    expect(terrainChunk(2, -1, "mixed")).toEqual(terrainChunk(2, -1));
  });
});

describe("terrainSpot", () => {
  it("shows several biomes for the mixed terrain", () => {
    const p = terrainSpot("mixed", 960, 600);
    const seen = new Set<string>();
    for (const fy of [-0.5, 0, 0.5]) for (const fx of [-0.5, 0, 0.5]) seen.add(biomeAt(p.x + fx * 960, p.y + fy * 600));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("puts a raised piece in the picture of each biome", () => {
    for (const biome of BIOMES) {
      const p = terrainSpot(biome, 960, 600);
      const { cx, cy } = { cx: Math.floor(p.x / CHUNK_SIZE), cy: Math.floor(p.y / CHUNK_SIZE) };
      const near = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].flatMap((dx) => terrainChunk(cx + dx, cy + dy, biome).pieces));
      expect(near.some((q) => Math.abs(q.x - p.x) < 480 && Math.abs(q.y - p.y) < 300), biome).toBe(true);
    }
  });
});

describe("baked raised pieces", () => {
  const art = terrainArt as Record<string, { radius: number; anchor: Pos; body: { x: number; y: number; width: number; height: number } }>;
  const kinds = Object.keys(PIECE_SIZE) as PieceKind[];

  it("has art for every variant of every raised piece", () => {
    for (const kind of kinds) {
      for (let v = 0; v < 3; v++) {
        const keys = kind === "woods" ? BIOMES.map((b) => `woods-${b}-${v}`) : [`${kind}-${v}`];
        for (const key of keys) expect(art[key], key).toBeDefined();
      }
    }
  });

  it("keeps every baked piece inside the box that fades it", () => {
    for (const [key, e] of Object.entries(art)) {
      const kind = kinds.find((k) => key.startsWith(`${k}-`));
      if (!kind) continue;
      const { radius, height } = PIECE_SIZE[kind];
      const box = pieceBox({ kind, biome: "meadow", x: 0, y: 0, variant: 0, radius, height });
      const r = e.radius;
      expect((e.body.x - e.anchor.x) * r, key).toBeGreaterThanOrEqual(box.x0);
      expect((e.body.x + e.body.width - e.anchor.x) * r, key).toBeLessThanOrEqual(box.x1);
      expect((e.body.y - e.anchor.y) * r, key).toBeGreaterThanOrEqual(box.y0);
      expect((e.body.y + e.body.height - e.anchor.y) * r, key).toBeLessThanOrEqual(box.y1);
    }
  });
});

describe("raised pieces among the figures", () => {
  const piece: RaisedPiece = {
    kind: "watchtower",
    biome: "meadow",
    x: 0,
    y: 0,
    variant: 0,
    radius: 60,
    height: 200,
  };
  const figureAt = (x: number, y: number) => ({ box: { x0: x - 30, x1: x + 30, y0: y - 60, y1: y + 30 }, y });

  it("draws a piece nothing overlaps at full strength, under the figures", () => {
    expect(pieceDepth(piece, [figureAt(400, 0)])).toEqual({ opacity: 1, inFront: false });
  });

  it("fades a piece that a figure stands in front of, and keeps it under the figures", () => {
    expect(pieceDepth(piece, [figureAt(20, 40)])).toEqual({ opacity: COVERED_OPACITY, inFront: false });
  });

  it("fades a piece that stands in front of a figure, and draws it over the figures", () => {
    expect(pieceDepth(piece, [figureAt(20, -120)])).toEqual({ opacity: COVERED_OPACITY, inFront: true });
  });

  it("covers the piece's height on screen", () => {
    const box = pieceBox(piece);
    expect(box.y0).toBe(-200);
    expect(box.y1).toBeGreaterThan(0);
  });
});

describe("view helpers", () => {
  it("lists the chunks a view touches", () => {
    const chunks = chunksIn({ x: -10, y: -10, width: 20, height: 20 });
    expect(chunks).toEqual([
      { cx: -1, cy: -1 },
      { cx: 0, cy: -1 },
      { cx: -1, cy: 0 },
      { cx: 0, cy: 0 },
    ]);
  });

  it("fades the grid out below its full zoom", () => {
    expect(gridOpacity(GRID_FULL_SCALE)).toBe(1);
    expect(gridOpacity(2)).toBe(1);
    expect(gridOpacity(GRID_GONE_SCALE)).toBe(0);
    expect(gridOpacity(0.2)).toBe(0);
    const mid = gridOpacity((GRID_FULL_SCALE + GRID_GONE_SCALE) / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
