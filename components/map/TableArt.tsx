import { memo, type ReactNode } from "react";
import manifest from "@/public/terrain/manifest.json";
import type { RaisedPiece, Scatter } from "@/lib/map/terrain";

/*
 * The art for the table's scatter, raised pieces and bridges. Almost all of it
 * is baked 3D models (`npm run bake:terrain`, into public/terrain/), in the
 * minis' three-quarter view and light, each with its shadow on the felt. The
 * two flat ground marks, leaf litter and puddles, have no model and are SVG
 * symbols in <TableArtDefs>. The map places any of them with <Art>.
 *
 * `artSource(key)` is the one place that decides where a piece's art comes from.
 */

export type ArtSource =
  | { kind: "symbol" }
  /** A baked image. Sizes are in world units; (`anchorX`, `anchorY`) is where the footprint centre sits, from the image's top-left. */
  | { kind: "image"; href: string; width: number; height: number; anchorX: number; anchorY: number };

type Entry = { image: string; radius: number; width: number; height: number; anchor: { x: number; y: number } };

/** Baked images by art key (e.g. "watchtower-0", "woods-meadow-2", "rock-1", "bridge-3"). */
const BAKED: Record<string, ArtSource> = Object.fromEntries(
  Object.entries(manifest as Record<string, Entry>).map(([key, e]) => [
    key,
    {
      kind: "image",
      href: e.image,
      width: e.width * e.radius,
      height: e.height * e.radius,
      anchorX: e.anchor.x * e.radius,
      anchorY: e.anchor.y * e.radius,
    },
  ]),
);

const SYMBOL: ArtSource = { kind: "symbol" };

export function artSource(key: string): ArtSource {
  return BAKED[key] ?? SYMBOL;
}

export const scatterKey = (s: Scatter) => `${s.kind}-${s.variant}`;
export const pieceKey = (p: RaisedPiece) =>
  p.kind === "woods" ? `woods-${p.biome}-${p.variant}` : `${p.kind}-${p.variant}`;
/** Bridges are baked lying at every BRIDGE_STEP degrees on screen (`bridge-0` along x, `bridge-1` at 15 degrees, and so on). */
const BRIDGE_STEP = 15;
const BRIDGE_TURNS = 180 / BRIDGE_STEP;

/**
 * The bridge for a road running at `angle` (radians, clockwise from the
 * right): the baked turn nearest to it, and the few degrees left to turn the
 * image by so it lies exactly along the road. A bridge looks the same from
 * either end of the road, so 180 degrees of turns cover every road.
 */
export function bridgeArt(angle: number): { artKey: string; rotate: number } {
  const degrees = (((angle * 180) / Math.PI) % 180 + 180) % 180;
  const turn = Math.round(degrees / BRIDGE_STEP) % BRIDGE_TURNS;
  let rotate = degrees - turn * BRIDGE_STEP;
  if (rotate > 90) rotate -= 180;
  return { artKey: `bridge-${turn}`, rotate };
}

/** Draws one piece of art with its footprint centre at (x, y). */
export function Art(props: { artKey: string; x: number; y: number; scale?: number; rotate?: number }) {
  const { artKey, x, y, scale = 1, rotate = 0 } = props;
  const transform = `translate(${r2(x)} ${r2(y)})${rotate ? ` rotate(${r2(rotate)})` : ""}${scale !== 1 ? ` scale(${r2(scale)})` : ""}`;
  const src = artSource(artKey);
  if (src.kind === "image") {
    return (
      <image
        href={src.href}
        x={r2(-src.anchorX)}
        y={r2(-src.anchorY)}
        width={r2(src.width)}
        height={r2(src.height)}
        transform={transform}
      />
    );
  }
  return <use href={`#t-${artKey}`} transform={transform} />;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const f1 = (v: number) => Math.round(v * 10) / 10;

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

/** Fallen leaves scattered flat on the felt. */
function leaves(variant: number): ReactNode {
  const rand = rng(1714 + variant * 37);
  const colours = ["#c0601e", "#a43422", "#d6a43a", "#8a5a2a", "#e08a3a"];
  const out: ReactNode[] = [];
  for (let k = 0; k < 11; k++) {
    out.push(
      <ellipse
        key={k}
        cx={f1((rand() - 0.5) * 30)}
        cy={f1((rand() - 0.5) * 14)}
        rx={2.4}
        ry={1.3}
        fill={colours[(k + variant) % colours.length]}
      />,
    );
  }
  return <g opacity={0.92}>{out}</g>;
}

/** A shallow puddle: a muddy rim, dark water and a sheen on the side of the light. */
function puddle(variant: number): ReactNode {
  const rx = 18 + variant * 5;
  return (
    <>
      <ellipse cx={0} cy={1} rx={rx + 4} ry={rx * 0.42 + 2} fill="#3e4a32" />
      <ellipse cx={0} cy={0} rx={rx} ry={rx * 0.42} fill="#22403f" />
      <ellipse cx={rx * 0.15} cy={rx * 0.06} rx={rx * 0.7} ry={rx * 0.26} fill="#2c5250" />
      <ellipse cx={-rx * 0.35} cy={-rx * 0.14} rx={rx * 0.32} ry={rx * 0.08} fill="#a8cdc4" opacity={0.55} />
    </>
  );
}

/** One symbol per flat ground mark. Render once inside the map's SVG. */
export const TableArtDefs = memo(function TableArtDefs() {
  const symbols: ReactNode[] = [];
  for (let v = 0; v < 3; v++) {
    symbols.push(<g key={`leaves-${v}`} id={`t-leaves-${v}`}>{leaves(v)}</g>);
    symbols.push(<g key={`puddle-${v}`} id={`t-puddle-${v}`}>{puddle(v)}</g>);
  }
  return <defs>{symbols}</defs>;
});
