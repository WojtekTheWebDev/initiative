import { describe, expect, it } from "vitest";
import type { Pos } from "@/lib/types";
import {
  BIOMES,
  CHUNK_SIZE,
  COVERED_OPACITY,
  GRID_FULL_SCALE,
  GRID_GONE_SCALE,
  MAX_PIECES,
  PIECE_SPACING,
  biomeWeights,
  chunksIn,
  gridOpacity,
  pieceBox,
  pieceDepth,
  terrainChunk,
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
});

describe("raised pieces among the figures", () => {
  const piece: RaisedPiece = {
    kind: "watchtower",
    biome: "meadow",
    x: 0,
    y: 0,
    variant: 0,
    flip: false,
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
