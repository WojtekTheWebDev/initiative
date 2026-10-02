"use client";

import { memo, useEffect, type ReactNode } from "react";
import type { ViewBox } from "@/lib/map/camera";
import {
  CHUNK_SIZE,
  GROUND_CELLS,
  RIVER_WIDTH,
  ROAD_WIDTH,
  SCATTER_MIN_SCALE,
  chunksIn,
  gridOpacity,
  pieceDepth,
  terrainChunk,
  type FigureFootprint,
  type Polyline,
  type RaisedPiece,
  type TerrainChunk,
} from "@/lib/map/terrain";
import { Art, BRIDGE_KEY, TableArtDefs, pieceKey, scatterKey } from "./TableArt";

/*
 * The felt table under the figures: biome-tinted felt, hills, rivers, roads,
 * scatter and raised pieces, all worked out from the world coordinates by
 * lib/map/terrain.ts. Only the chunks in view are drawn, and each chunk's
 * drawing is memoised, so panning only moves the viewBox. Nothing here takes
 * pointer events.
 *
 * Draw order: <TableGround> (felt and everything flat on it), then raised
 * pieces that stand behind the figures, then the figures, then raised pieces
 * that stand in front of a figure they overlap (faded, see `pieceDepth`).
 */

/** The felt colour around the chunks, and under the canvas before it is measured. */
export const FELT_BASE = "#4e6b3a";

/** Chunks this far outside the view are drawn too, so scatter and tall pieces near a border never pop in. */
const OVERSCAN = 260;
/** Below this zoom, contour lines are too thin to see and are left out. */
const CONTOUR_MIN_SCALE = 0.2;
/** World units per repeat of the felt nap tile, and of the large-scale dye mottle. */
const NAP_TILE = 150;
const MOTTLE_TILE = 1900;
/** Grid spacing, in world units. Every fifth line is stronger. */
const GRID_STEP = 100;

/* ------------------------------------------------------------------------ */
/* Chunk cache                                                              */
/* ------------------------------------------------------------------------ */

type DrawnChunk = TerrainChunk & {
  groundUrl: string;
  roadPath: string;
  riverPath: string;
};

/** Generated chunks, oldest first. Generation is pure, so this only saves time. */
const cache = new Map<string, DrawnChunk>();
const CACHE_LIMIT = 600;

function chunk(cx: number, cy: number): DrawnChunk {
  const key = `${cx},${cy}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = terrainChunk(cx, cy);
  const drawn: DrawnChunk = {
    ...c,
    groundUrl: bmpDataUrl(c.ground, GROUND_CELLS + 1),
    roadPath: linesPath(c.roads),
    riverPath: linesPath(c.rivers),
  };
  cache.set(key, drawn);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return drawn;
}

const f1 = (v: number) => Math.round(v * 10) / 10;

function linesPath(lines: Polyline[]): string {
  return lines.map((l) => l.map((p, i) => `${i ? "L" : "M"}${f1(p.x)} ${f1(p.y)}`).join("")).join("");
}

/** A size × size RGB image as an uncompressed BMP data URL: tiny, and smooth when the browser scales it up. */
function bmpDataUrl(rgb: Uint8Array, size: number): string {
  const row = Math.ceil((size * 3) / 4) * 4;
  const bytes = new Uint8Array(54 + row * size);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, size, true);
  view.setInt32(22, size, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, row * size, true);
  for (let j = 0; j < size; j++) {
    const out = 54 + (size - 1 - j) * row; // BMP rows run bottom to top
    for (let i = 0; i < size; i++) {
      const at = (j * size + i) * 3;
      bytes[out + i * 3] = rgb[at + 2];
      bytes[out + i * 3 + 1] = rgb[at + 1];
      bytes[out + i * 3 + 2] = rgb[at];
    }
  }
  let binary = "";
  for (let k = 0; k < bytes.length; k++) binary += String.fromCharCode(bytes[k]);
  return `data:image/bmp;base64,${btoa(binary)}`;
}

/* ------------------------------------------------------------------------ */
/* Per-chunk layers                                                         */
/* ------------------------------------------------------------------------ */

/**
 * The flat layers of a chunk, each drawn for every visible chunk before the
 * next layer starts. Neighbouring chunks overlap a little at their borders
 * (image edges, round line caps), so drawing layer by layer keeps every seam
 * invisible.
 */
type Layer =
  | "ground"
  | "contours"
  | "riverBank"
  | "riverWater"
  | "riverDeep"
  | "riverSheen"
  | "roadEdge"
  | "roadBed"
  | "roadRuts"
  | "roadCrown"
  | "bridges"
  | "scatter";

const LINE: Partial<Record<Layer, { path: "roadPath" | "riverPath"; stroke: string; width: number }>> = {
  riverBank: { path: "riverPath", stroke: "#45482c", width: RIVER_WIDTH + 18 },
  riverWater: { path: "riverPath", stroke: "#24484f", width: RIVER_WIDTH },
  riverDeep: { path: "riverPath", stroke: "#1d3d46", width: RIVER_WIDTH * 0.42 },
  roadEdge: { path: "roadPath", stroke: "#4c4129", width: ROAD_WIDTH + 6 },
  roadBed: { path: "roadPath", stroke: "#8c7650", width: ROAD_WIDTH },
  roadRuts: { path: "roadPath", stroke: "#725f40", width: 15 },
  roadCrown: { path: "roadPath", stroke: "#857049", width: 9 },
};

const ChunkLayer = memo(function ChunkLayer({ cx, cy, layer, detail }: { cx: number; cy: number; layer: Layer; detail: boolean }) {
  const c = chunk(cx, cy);
  const line = LINE[layer];
  if (line) {
    const d = c[line.path];
    return d ? <path d={d} fill="none" stroke={line.stroke} strokeWidth={line.width} strokeLinecap="round" strokeLinejoin="round" /> : null;
  }
  switch (layer) {
    case "ground": {
      // Samples sit on the chunk's corners and borders, so each image reaches half a sample past the chunk.
      const step = CHUNK_SIZE / GROUND_CELLS;
      return (
        <image
          href={c.groundUrl}
          x={cx * CHUNK_SIZE - step / 2}
          y={cy * CHUNK_SIZE - step / 2}
          width={CHUNK_SIZE + step}
          height={CHUNK_SIZE + step}
          preserveAspectRatio="none"
        />
      );
    }
    case "contours":
      if (!c.contours) return null;
      // A dark line on the shaded side of each terrace, with a lit edge just above and left of it.
      return (
        <g fill="none" strokeLinecap="round">
          <path d={c.contours} stroke="#ece7b0" strokeOpacity={0.22} strokeWidth={2} transform="translate(-2.2 -2.2)" />
          <path d={c.contours} stroke="#1c2a14" strokeOpacity={0.5} strokeWidth={2.6} />
        </g>
      );
    case "riverSheen":
      return c.riverPath ? (
        <path d={c.riverPath} fill="none" stroke="#8fbcb6" strokeOpacity={0.35} strokeWidth={2.5} strokeDasharray="26 40 8 30" strokeLinecap="round" transform={`translate(${-RIVER_WIDTH * 0.22} -3)`} />
      ) : null;
    case "bridges":
      return c.bridges.length ? (
        <>
          {c.bridges.map((b, i) => (
            <Art key={i} artKey={BRIDGE_KEY} x={b.x} y={b.y} rotate={(b.angle * 180) / Math.PI} />
          ))}
        </>
      ) : null;
    case "scatter": {
      if (!detail) return null;
      return (
        <>
          {c.scatter.map((s, i) => (
            <Art key={i} artKey={scatterKey(s)} x={s.x} y={s.y} scale={s.scale} flip={s.flip} />
          ))}
        </>
      );
    }
    default:
      return null;
  }
});

/* ------------------------------------------------------------------------ */
/* The table                                                                */
/* ------------------------------------------------------------------------ */

/** Patterns and art used by the table. Render once inside the map's SVG. */
export const TableDefs = memo(function TableDefs() {
  return (
    <>
      <defs>
        <pattern id="t-nap" width={NAP_TILE} height={NAP_TILE} patternUnits="userSpaceOnUse">
          <image href="/terrain/felt-nap.png" width={NAP_TILE} height={NAP_TILE} />
        </pattern>
        <pattern id="t-mottle" width={MOTTLE_TILE} height={MOTTLE_TILE} patternUnits="userSpaceOnUse">
          <image href="/terrain/felt-mottle.png" width={MOTTLE_TILE} height={MOTTLE_TILE} />
        </pattern>
      </defs>
      <TableArtDefs />
    </>
  );
});

function visibleChunks(vb: ViewBox) {
  return chunksIn(vb, OVERSCAN);
}

const FLAT_BELOW_FELT: Layer[] = ["ground", "contours", "riverBank", "riverWater", "riverDeep", "riverSheen", "roadEdge", "roadBed", "roadRuts", "roadCrown"];
const FLAT_ON_FELT: Layer[] = ["bridges", "scatter"];

/** The felt and everything flat on it. Goes first in the map's SVG. */
export function TableGround({ viewBox: vb, scale }: { viewBox: ViewBox; scale: number }) {
  const chunks = visibleChunks(vb);
  useWarmRing(vb);
  const detail = scale >= SCATTER_MIN_SCALE;
  const layers = (list: Layer[]): ReactNode =>
    list.map((layer) =>
      layer === "contours" && scale < CONTOUR_MIN_SCALE ? null : (
        <g key={layer}>
          {chunks.map(({ cx, cy }) => (
            <ChunkLayer key={`${cx},${cy}`} cx={cx} cy={cy} layer={layer} detail={detail} />
          ))}
        </g>
      ),
    );
  const px = 1 / scale;
  const grid = gridOpacity(scale);
  // The nap is fine detail; zoomed far out it would only shimmer, so it fades away.
  const nap = Math.min(1, Math.max(0, (scale - 0.18) / 0.4));
  const cover = { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      <rect {...cover} fill={FELT_BASE} />
      {layers(FLAT_BELOW_FELT)}
      <rect {...cover} fill="url(#t-mottle)" />
      {nap > 0 && <rect {...cover} fill="url(#t-nap)" opacity={nap} />}
      {grid > 0 && <Grid viewBox={vb} px={px} opacity={grid} />}
      {layers(FLAT_ON_FELT)}
    </g>
  );
}

/**
 * Generates the ring of chunks just outside the drawn area while the browser is
 * idle, so a chunk is ready before panning brings it into view.
 */
function useWarmRing(vb: ViewBox) {
  const ring = chunksIn(vb, OVERSCAN + CHUNK_SIZE);
  const first = ring[0];
  const last = ring[ring.length - 1];
  const key = `${first.cx},${first.cy},${last.cx},${last.cy}`;
  useEffect(() => {
    const [cx0, cy0, cx1, cy1] = key.split(",").map(Number);
    const todo: [number, number][] = [];
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) if (!cache.has(`${cx},${cy}`)) todo.push([cx, cy]);
    }
    if (todo.length === 0) return;
    const idle = typeof requestIdleCallback === "function";
    let handle = 0;
    const work = (deadline?: IdleDeadline) => {
      while (todo.length > 0 && (!deadline || deadline.timeRemaining() > 3)) {
        const [cx, cy] = todo.pop()!;
        chunk(cx, cy);
        if (!deadline) break;
      }
      if (todo.length > 0) schedule();
    };
    const schedule = () => {
      handle = idle ? requestIdleCallback(work, { timeout: 500 }) : window.setTimeout(work, 16);
    };
    schedule();
    return () => (idle ? cancelIdleCallback(handle) : window.clearTimeout(handle));
  }, [key]);
}

/** A faint chalk grid, so distances still read on the felt. */
function Grid({ viewBox: vb, px, opacity }: { viewBox: ViewBox; px: number; opacity: number }) {
  const major = GRID_STEP * 5;
  return (
    <g opacity={opacity}>
      <defs>
        <pattern id="t-grid-minor" width={GRID_STEP} height={GRID_STEP} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_STEP} 0 L 0 0 0 ${GRID_STEP}`} fill="none" stroke="#f4ecc8" strokeOpacity={0.06} strokeWidth={px} />
        </pattern>
        <pattern id="t-grid" width={major} height={major} patternUnits="userSpaceOnUse">
          <rect width={major} height={major} fill="url(#t-grid-minor)" />
          <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke="#f4ecc8" strokeOpacity={0.12} strokeWidth={px} />
        </pattern>
      </defs>
      <rect x={vb.x} y={vb.y} width={vb.width} height={vb.height} fill="url(#t-grid)" />
    </g>
  );
}

/**
 * Raised pieces in view. With `front` false: the ones that go under the
 * figures. With `front` true: the ones that stand in front of a figure they
 * overlap, drawn over the figures. See `pieceDepth`.
 */
export function TablePieces({
  viewBox: vb,
  footprints,
  front,
}: {
  viewBox: ViewBox;
  footprints: FigureFootprint[];
  front: boolean;
}) {
  const pieces: { piece: RaisedPiece; opacity: number }[] = [];
  for (const { cx, cy } of visibleChunks(vb)) {
    for (const piece of chunk(cx, cy).pieces) {
      const depth = pieceDepth(piece, footprints);
      if (depth.inFront === front) pieces.push({ piece, opacity: depth.opacity });
    }
  }
  if (pieces.length === 0) return null;
  pieces.sort((a, b) => a.piece.y - b.piece.y);
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      {pieces.map(({ piece, opacity }) => (
        <g
          key={`${piece.x},${piece.y}`}
          opacity={opacity}
          style={{ transition: "opacity 200ms ease-out" }}
        >
          <Art artKey={pieceKey(piece)} x={piece.x} y={piece.y} flip={piece.flip} />
        </g>
      ))}
    </g>
  );
}

/**
 * A warm lamp hanging over the middle of the table: light pooled in the centre,
 * falling off toward the edges of the screen. Fixed to the viewport, not the world.
 */
export function Lamp() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 72% 78% at 46% 42%, rgba(255, 216, 150, 0.16) 0%, rgba(255, 200, 130, 0.07) 34%, rgba(0, 0, 0, 0) 54%, rgba(14, 9, 3, 0.32) 80%, rgba(8, 5, 2, 0.6) 100%)",
      }}
    />
  );
}
