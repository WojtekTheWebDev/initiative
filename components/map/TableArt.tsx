import { memo, type ReactNode } from "react";
import type { Biome, PieceKind, RaisedPiece, Scatter, ScatterKind } from "@/lib/map/terrain";

/*
 * The art for the table's scatter, raised pieces and bridges, painted as SVG in
 * the same three-quarter view as the minis (38° elevation, key light from the
 * upper left): lit faces on the upper left, shade and cast shadows to the lower
 * right. Each piece of art is drawn once, as a symbol in <TableArtDefs>, with
 * its footprint centre at (0, 0) and one unit per world unit. The map places it
 * with <Art>.
 *
 * `artSource(key)` is the one place that decides where a piece's art comes
 * from. A key listed in BAKED is drawn as that image instead of its symbol.
 */

export type ArtSource =
  | { kind: "symbol" }
  /** A baked image. `anchorX`/`anchorY` are where the footprint centre sits, in image pixels; `unitsPerPx` scales it to world units. */
  | { kind: "image"; href: string; width: number; height: number; anchorX: number; anchorY: number; unitsPerPx: number };

/** Baked images that replace a symbol, by art key (e.g. "watchtower-0", "woods-meadow-2", "rock-1"). */
const BAKED: Record<string, ArtSource> = {};

const SYMBOL: ArtSource = { kind: "symbol" };

export function artSource(key: string): ArtSource {
  return BAKED[key] ?? SYMBOL;
}

export const scatterKey = (s: Scatter) => `${s.kind}-${s.variant}`;
export const pieceKey = (p: RaisedPiece) =>
  p.kind === "woods" ? `woods-${p.biome}-${p.variant}` : `${p.kind}-${p.variant}`;
export const BRIDGE_KEY = "bridge";

/** Draws one piece of art with its footprint centre at (x, y). */
export function Art(props: {
  artKey: string;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  rotate?: number;
}) {
  const { artKey, x, y, scale = 1, flip = false, rotate = 0 } = props;
  const transform = `translate(${r2(x)} ${r2(y)})${rotate ? ` rotate(${r2(rotate)})` : ""} scale(${r2(flip ? -scale : scale)} ${r2(scale)})`;
  const src = artSource(artKey);
  if (src.kind === "image") {
    const k = src.unitsPerPx;
    return (
      <image
        href={src.href}
        x={-src.anchorX * k}
        y={-src.anchorY * k}
        width={src.width * k}
        height={src.height * k}
        transform={transform}
      />
    );
  }
  return <use href={`#t-${artKey}`} transform={transform} />;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const f1 = (v: number) => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------------ */
/* Palette                                                                  */
/* ------------------------------------------------------------------------ */

const STONE = { light: "#c4beae", mid: "#9a9484", dark: "#6c675b", deep: "#4d493f" };
const BARK = { light: "#8a6642", mid: "#6a4a2d", dark: "#4a321e" };
const WOOD_END = { light: "#d8b27e", ring: "#a8804f" };

/** Leaf colours: dark (shaded side), mid, light (lit side). */
type Leaf = [string, string, string];
const GREEN: Leaf = ["#2c4b23", "#45722f", "#7aa64a"];
const DEEP_GREEN: Leaf = ["#243d22", "#3a5e33", "#64884a"];
const PINE: Leaf = ["#1f3a2a", "#2f5a3c", "#55835a"];
const MARSH_LEAF: Leaf = ["#2c4434", "#45624a", "#77926a"];
const AUTUMN: Leaf[] = [
  ["#7a3210", "#c0601e", "#efa54c"],
  ["#651d12", "#a43422", "#dd6a3e"],
  ["#7c5c12", "#c09426", "#f1cf5e"],
];
const GRASS = ["#3c5a28", "#5a7f36", "#8db152"];
const DRY = ["#7c6b34", "#a38f48", "#d2bc6a"];
const MARSH_GRASS = ["#3c5636", "#5a7748", "#8aa66a"];

/* ------------------------------------------------------------------------ */
/* Building blocks                                                          */
/* ------------------------------------------------------------------------ */

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

/** A soft cast shadow, falling to the lower right of the light. */
function Shadow({ x = 0, y = 0, rx, ry, opacity = 1 }: { x?: number; y?: number; rx: number; ry: number; opacity?: number }) {
  return <ellipse cx={f1(x)} cy={f1(y)} rx={f1(rx)} ry={f1(ry)} fill="url(#t-shadow)" opacity={opacity} />;
}

const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");

/** An irregular boulder about `size` wide: a shaded body, a lit top facet and a bright edge. */
function rock(rand: () => number, size: number, cx = 0, cy = 0): ReactNode {
  const n = 7;
  const body: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rand() * 0.4;
    const r = 0.78 + rand() * 0.3;
    body.push([cx + Math.cos(a) * size * r, cy - size * 0.38 + Math.sin(a) * size * 0.66 * r]);
  }
  const top = body.map(([x, y]) => [cx + (x - cx) * 0.66 - size * 0.16, cy - size * 0.38 + (y - cy + size * 0.38) * 0.56 - size * 0.26] as [number, number]);
  return (
    <>
      <Shadow x={cx + size * 0.4} y={cy + size * 0.12} rx={size * 1.25} ry={size * 0.5} />
      <polygon points={poly(body)} fill={STONE.dark} />
      <polygon points={poly(body.slice(0, 4).map(([x, y]) => [x, y]))} fill={STONE.deep} opacity={0.6} />
      <polygon points={poly(top)} fill={STONE.mid} />
      <polygon points={poly(top.slice(3, 7))} fill={STONE.light} />
    </>
  );
}

/** A clump of blades rising from the ground: dark at the back, light at the front left. */
function blades(rand: () => number, count: number, height: number, spread: number, palette: string[], width = 1.6): ReactNode {
  const paths: string[][] = [[], [], []];
  for (let k = 0; k < count; k++) {
    const bx = (rand() - 0.5) * spread;
    const h = height * (0.6 + rand() * 0.4);
    const lean = (rand() - 0.5) * height * 0.8 + bx * 0.4;
    const tone = k < count / 3 ? 0 : bx < 0 ? 2 : 1;
    paths[tone].push(`M${f1(bx)} 0Q${f1(bx + lean * 0.2)} ${f1(-h * 0.6)} ${f1(bx + lean)} ${f1(-h)}`);
  }
  return paths.map((d, i) =>
    d.length ? <path key={i} d={d.join("")} stroke={palette[i]} strokeWidth={width} fill="none" strokeLinecap="round" /> : null,
  );
}

/** A rounded cluster of leaves: shaded lobes at the lower right, lit lobes at the upper left. */
function canopy(rand: () => number, cx: number, cy: number, r: number, leaf: Leaf): ReactNode {
  const lobes: ReactNode[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rand();
    lobes.push(
      <circle key={`d${k}`} cx={f1(cx + Math.cos(a) * r * 0.55 + r * 0.12)} cy={f1(cy + Math.sin(a) * r * 0.45 + r * 0.1)} r={f1(r * (0.5 + rand() * 0.15))} fill={leaf[0]} />,
    );
  }
  for (let k = 0; k < 4; k++) {
    const a = Math.PI + (k / 4) * Math.PI * 0.9 + rand() * 0.3;
    lobes.push(
      <circle key={`m${k}`} cx={f1(cx + Math.cos(a) * r * 0.3)} cy={f1(cy + Math.sin(a) * r * 0.28)} r={f1(r * (0.48 + rand() * 0.12))} fill={leaf[1]} />,
    );
  }
  for (let k = 0; k < 3; k++) {
    lobes.push(
      <circle key={`l${k}`} cx={f1(cx - r * (0.25 + rand() * 0.2))} cy={f1(cy - r * (0.25 + rand() * 0.2))} r={f1(r * (0.2 + rand() * 0.1))} fill={leaf[2]} />,
    );
  }
  return lobes;
}

function deciduous(rand: () => number, x: number, y: number, size: number, leaf: Leaf, key: string | number): ReactNode {
  const trunkH = size * 0.9;
  return (
    <g key={key}>
      <Shadow x={x + size * 0.7} y={y + size * 0.12} rx={size * 1.3} ry={size * 0.45} />
      <path d={`M${f1(x - size * 0.13)} ${f1(y)}L${f1(x - size * 0.08)} ${f1(y - trunkH)}L${f1(x + size * 0.1)} ${f1(y - trunkH)}L${f1(x + size * 0.15)} ${f1(y)}Z`} fill={BARK.mid} />
      <path d={`M${f1(x - size * 0.13)} ${f1(y)}L${f1(x - size * 0.08)} ${f1(y - trunkH)}L${f1(x)} ${f1(y - trunkH)}L${f1(x - size * 0.02)} ${f1(y)}Z`} fill={BARK.light} />
      {canopy(rand, x, y - trunkH - size * 0.55, size, leaf)}
    </g>
  );
}

function pine(rand: () => number, x: number, y: number, size: number, key: string | number): ReactNode {
  const tiers = 3;
  const out: ReactNode[] = [
    <Shadow key="s" x={x + size * 0.6} y={y + size * 0.1} rx={size * 1.1} ry={size * 0.38} />,
    <rect key="t" x={f1(x - size * 0.09)} y={f1(y - size * 0.5)} width={f1(size * 0.18)} height={f1(size * 0.5)} fill={BARK.dark} />,
  ];
  for (let k = 0; k < tiers; k++) {
    const base = y - size * (0.35 + k * 0.62);
    const w = size * (0.85 - k * 0.2) * (0.92 + rand() * 0.16);
    const apex = base - size * 0.95;
    out.push(
      <polygon key={`r${k}`} points={poly([[x - w, base], [x, apex], [x + w, base], [x + w * 0.2, base + size * 0.12]])} fill={PINE[0]} />,
      <polygon key={`l${k}`} points={poly([[x - w, base], [x, apex], [x + w * 0.05, base + size * 0.1]])} fill={PINE[1]} />,
      <polygon key={`h${k}`} points={poly([[x - w * 0.7, base - size * 0.1], [x - w * 0.05, apex + size * 0.12], [x - w * 0.2, base - size * 0.05]])} fill={PINE[2]} />,
    );
  }
  return <g key={key}>{out}</g>;
}

function deadTree(x: number, y: number, size: number, key: string | number): ReactNode {
  const h = size * 2;
  return (
    <g key={key} fill="none" strokeLinecap="round">
      <Shadow x={x + size * 0.5} y={y + size * 0.08} rx={size * 0.8} ry={size * 0.28} />
      <path d={`M${f1(x)} ${f1(y)}L${f1(x + 2)} ${f1(y - h)}M${f1(x + 1)} ${f1(y - h * 0.55)}L${f1(x - size * 0.6)} ${f1(y - h * 0.85)}M${f1(x + 1.5)} ${f1(y - h * 0.7)}L${f1(x + size * 0.55)} ${f1(y - h * 0.95)}M${f1(x - size * 0.35)} ${f1(y - h * 0.72)}L${f1(x - size * 0.45)} ${f1(y - h * 0.98)}`} stroke={BARK.dark} strokeWidth={f1(size * 0.16)} />
      <path d={`M${f1(x - 1)} ${f1(y)}L${f1(x + 1)} ${f1(y - h)}M${f1(x)} ${f1(y - h * 0.55)}L${f1(x - size * 0.6)} ${f1(y - h * 0.85)}`} stroke="#8c7a64" strokeWidth={f1(size * 0.06)} />
    </g>
  );
}

/** A flat scenic base: a bevelled edge and flocked top, as wargame terrain sits on. */
function sceneBase(rand: () => number, rx: number, ry: number, top: string, edge: string): ReactNode {
  const n = 14;
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const r = 0.86 + rand() * 0.16;
    pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]);
  }
  return (
    <>
      <Shadow x={rx * 0.08} y={ry * 0.12} rx={rx * 1.12} ry={ry * 1.15} opacity={0.8} />
      <polygon points={poly(pts.map(([x, y]) => [x + 2, y + 4]))} fill={edge} />
      <polygon points={poly(pts)} fill={top} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Scatter                                                                  */
/* ------------------------------------------------------------------------ */

function scatterArt(kind: ScatterKind, variant: number): ReactNode {
  const rand = rng(1000 + variant * 37 + kind.length * 101 + kind.charCodeAt(0));
  switch (kind) {
    case "rock":
      return rock(rand, 9 + variant * 3.5);
    case "pebbles":
      return (
        <>
          {rock(rand, 3.4, -6, 1)}
          {rock(rand, 2.6, 4, -2)}
          {rock(rand, 3, 2, 5)}
          {variant > 0 && rock(rand, 2.2, -1, -5)}
        </>
      );
    case "tuft":
      return blades(rand, 9 + variant * 2, 11 + variant * 2, 9, GRASS);
    case "dryTuft":
      return blades(rand, 8 + variant * 2, 10 + variant * 2, 10, DRY, 1.4);
    case "flowers": {
      const colours = [["#f4f1e4", "#e8cf4a"], ["#b08ad8", "#f4f1e4"], ["#e05a4a", "#f0c040"]][variant];
      const dots: ReactNode[] = [];
      for (let k = 0; k < 6; k++) {
        const x = (rand() - 0.5) * 14;
        const y = -6 - rand() * 7;
        dots.push(<circle key={k} cx={f1(x)} cy={f1(y)} r={1.9} fill={colours[k % 2]} />);
        dots.push(<circle key={`h${k}`} cx={f1(x - 0.6)} cy={f1(y - 0.6)} r={0.7} fill="#fffbe8" />);
      }
      return (
        <>
          {blades(rand, 7, 9, 10, GRASS, 1.3)}
          {dots}
        </>
      );
    }
    case "log": {
      const len = 20 + variant * 5;
      return (
        <g transform={`rotate(${[-8, 12, -20][variant]})`}>
          <Shadow x={4} y={3} rx={len + 6} ry={6} />
          <rect x={-len} y={-9} width={len * 2} height={9} rx={4.5} fill={BARK.mid} />
          <rect x={-len} y={-9} width={len * 2} height={3.4} rx={1.7} fill={BARK.light} />
          <path d={`M${-len * 0.4} -5h${len * 0.5}M${len * 0.2} -3h${len * 0.5}`} stroke={BARK.dark} strokeWidth={1} />
          <ellipse cx={-len} cy={-4.5} rx={3.2} ry={4.6} fill={WOOD_END.light} />
          <ellipse cx={-len} cy={-4.5} rx={1.6} ry={2.3} fill="none" stroke={WOOD_END.ring} strokeWidth={0.8} />
          {variant !== 1 && <ellipse cx={len * 0.35} cy={-8} rx={5} ry={2} fill={GRASS[1]} />}
        </g>
      );
    }
    case "reeds": {
      const heads: ReactNode[] = [];
      for (let k = 0; k < 2 + variant; k++) {
        const x = (rand() - 0.5) * 10;
        const h = 22 + rand() * 8;
        heads.push(
          <g key={k}>
            <path d={`M${f1(x)} 0L${f1(x + 1)} ${f1(-h)}`} stroke={MARSH_GRASS[0]} strokeWidth={1} />
            <rect x={f1(x - 0.6)} y={f1(-h - 6)} width={3.2} height={8} rx={1.6} fill="#5a3a22" />
            <rect x={f1(x - 0.4)} y={f1(-h - 5)} width={1.2} height={5} rx={0.6} fill="#8a6040" />
          </g>,
        );
      }
      return (
        <>
          <Shadow x={4} y={1} rx={11} ry={3.5} />
          {blades(rand, 11, 24, 10, MARSH_GRASS, 1.4)}
          {heads}
        </>
      );
    }
    case "bush":
    case "autumnBush": {
      const leaf = kind === "bush" ? (variant === 2 ? DEEP_GREEN : GREEN) : AUTUMN[variant];
      const size = 11 + variant * 2;
      return (
        <>
          <Shadow x={size * 0.6} y={2} rx={size * 1.3} ry={size * 0.45} />
          {canopy(rand, 0, -size * 0.6, size, leaf)}
        </>
      );
    }
    case "leaves": {
      const out: ReactNode[] = [];
      const colours = ["#c0601e", "#a43422", "#d6a43a", "#8a5a2a", "#e08a3a"];
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
    case "puddle": {
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
  }
}

/* ------------------------------------------------------------------------ */
/* Raised pieces                                                            */
/* ------------------------------------------------------------------------ */

const BASE_TOP: Record<Biome, [string, string]> = {
  meadow: ["#4a6a33", "#2e3b22"],
  woods: ["#5f5628", "#3a3018"],
  highlands: ["#5a5f44", "#363a2a"],
  marsh: ["#3d5541", "#25342a"],
};

function woodsArt(biome: Biome, variant: number): ReactNode {
  const rand = rng(77 + variant * 13 + biome.length * 7);
  const rx = 118;
  const ry = rx * 0.62;
  const [top, edge] = BASE_TOP[biome];
  const trees: { x: number; y: number; size: number }[] = [];
  const count = 6 + variant;
  for (let tries = 0; trees.length < count && tries < 200; tries++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.78;
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r;
    if (trees.some((t) => Math.hypot(t.x - x, (t.y - y) / 0.62) < 46)) continue;
    trees.push({ x, y, size: 20 + rand() * 9 });
  }
  trees.sort((a, b) => a.y - b.y);
  const litter: ReactNode[] = [];
  for (let k = 0; k < 26; k++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.85;
    const colours = biome === "woods" ? ["#b0581c", "#8a2e18", "#c9952e"] : biome === "highlands" ? ["#6b5a36", "#4a4a30", "#7a6a40"] : ["#3a5a2a", "#5a7a38", "#6d5a32"];
    litter.push(<ellipse key={k} cx={f1(Math.cos(a) * rx * r)} cy={f1(Math.sin(a) * ry * r)} rx={2.6} ry={1.4} fill={colours[k % 3]} />);
  }
  return (
    <>
      {sceneBase(rand, rx, ry, top, edge)}
      {litter}
      {trees.map((t, i) => {
        if (biome === "highlands") return pine(rand, t.x, t.y, t.size, i);
        if (biome === "marsh" && i % 3 === 1) return deadTree(t.x, t.y, t.size, i);
        const leaf = biome === "woods" ? AUTUMN[Math.floor(rand() * 3)] : biome === "marsh" ? MARSH_LEAF : i % 4 === 3 ? DEEP_GREEN : GREEN;
        return deciduous(rand, t.x, t.y, t.size, leaf, i);
      })}
    </>
  );
}

/** A stretch of wall seen from the front: its face, its lit top and its broken upper edge. */
function wallFront(rand: () => number, x: number, y: number, len: number, h: number, depth: number, key: string | number): ReactNode {
  const steps = Math.max(3, Math.round(len / 9));
  const jag: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const broken = h * (0.55 + 0.45 * Math.abs(Math.sin(t * 3.1 + rand() * 0.8)));
    jag.push([x + t * len, y - broken]);
  }
  const top = [...jag, ...[...jag].reverse().map(([px, py]) => [px - depth * 0.3, py - depth * 0.62] as [number, number])];
  const courses: string[] = [];
  for (let cy = y - 8; cy > y - h; cy -= 8) courses.push(`M${f1(x)} ${f1(cy)}h${f1(len)}`);
  return (
    <g key={key}>
      <polygon points={poly([[x, y], ...jag, [x + len, y]])} fill={STONE.mid} />
      <path d={courses.join("")} stroke={STONE.dark} strokeWidth={0.8} opacity={0.6} />
      <polygon points={poly(top)} fill={STONE.light} />
      <polygon points={poly([[x, y], [x, jag[0][1]], [x - depth * 0.3, jag[0][1] - depth * 0.62], [x - depth * 0.3, y - depth * 0.62]])} fill="#b2ab9a" />
    </g>
  );
}

function ruinsArt(variant: number): ReactNode {
  const rand = rng(301 + variant * 17);
  const slabs: ReactNode[] = [];
  for (let k = 0; k < 9; k++) {
    const x = (rand() - 0.5) * 140;
    const y = (rand() - 0.5) * 70;
    slabs.push(<rect key={k} x={f1(x)} y={f1(y)} width={f1(16 + rand() * 12)} height={f1(9 + rand() * 6)} rx={1.5} fill={k % 2 ? "#8a8676" : "#9d9886"} opacity={0.85} />);
  }
  const rubble: ReactNode[] = [];
  for (let k = 0; k < 7; k++) rubble.push(<g key={k}>{rock(rand, 4 + rand() * 4, (rand() - 0.3) * 150, 10 + rand() * 40)}</g>);
  return (
    <>
      <Shadow x={10} y={10} rx={110} ry={58} opacity={0.7} />
      <ellipse cx={0} cy={4} rx={98} ry={56} fill="#6a6a52" opacity={0.55} />
      {slabs}
      {wallFront(rand, -80, -22, 70, 52, 12, "w1")}
      {variant !== 1 && wallFront(rand, 10, -34, 52, 40, 12, "w2")}
      {variant === 2 ? (
        <g>
          <rect x={18} y={-62} width={14} height={62} fill={STONE.mid} />
          <rect x={18} y={-62} width={5} height={62} fill={STONE.light} />
          <rect x={58} y={-62} width={14} height={62} fill={STONE.mid} />
          <rect x={58} y={-62} width={5} height={62} fill={STONE.light} />
          <path d="M18 -62 Q45 -96 72 -62 L58 -62 Q45 -80 32 -62Z" fill={STONE.mid} />
          <path d="M18 -62 Q45 -96 72 -62 L66 -66 Q45 -92 24 -66Z" fill={STONE.light} />
        </g>
      ) : (
        wallFront(rand, -6, 18, 46, 28, 12, "w3")
      )}
      <g transform="rotate(-12)">
        <rect x={-30} y={34} width={44} height={10} rx={5} fill={STONE.mid} />
        <rect x={-30} y={34} width={44} height={4} rx={2} fill={STONE.light} />
        <ellipse cx={-30} cy={39} rx={3} ry={5} fill="#cfc8b6" />
      </g>
      {rubble}
      <ellipse cx={-60} cy={-24} rx={12} ry={4} fill={GRASS[1]} opacity={0.9} />
      <ellipse cx={30} cy={-36} rx={9} ry={3} fill={GRASS[1]} opacity={0.9} />
    </>
  );
}

function towerArt(variant: number): ReactNode {
  if (variant === 1) {
    // A wooden lookout on four posts.
    return (
      <>
        <Shadow x={30} y={12} rx={70} ry={26} />
        <path d="M-26 0L-20 -120M26 0L20 -120M-14 -8L-11 -120M14 -8L11 -120" stroke={BARK.mid} strokeWidth={6} strokeLinecap="round" />
        <path d="M-26 0L-20 -120M-14 -8L-11 -120" stroke={BARK.light} strokeWidth={2.5} strokeLinecap="round" />
        <path d="M-23 -30L22 -70M23 -30L-22 -70M-22 -76L20 -112" stroke={BARK.dark} strokeWidth={3} />
        <path d="M-6 0L-6 -118M6 0L6 -118M-6 -12h12M-6 -28h12M-6 -44h12M-6 -60h12M-6 -76h12M-6 -92h12M-6 -108h12" stroke="#9a7650" strokeWidth={2} />
        <polygon points="-34,-120 34,-120 40,-112 -28,-112" fill={BARK.dark} />
        <polygon points="-34,-120 34,-120 28,-130 -28,-130" fill={BARK.light} />
        <rect x={-30} y={-148} width={60} height={20} fill={BARK.mid} />
        <rect x={-30} y={-148} width={22} height={20} fill={BARK.light} />
        <path d="M-30 -148v20M-18 -148v20M-6 -148v20M6 -148v20M18 -148v20" stroke={BARK.dark} strokeWidth={1} />
        <polygon points="-40,-148 40,-148 0,-188" fill="#7a4a2a" />
        <polygon points="-40,-148 -4,-148 0,-188" fill="#a8683e" />
        <path d="M0 -188v-14" stroke={BARK.dark} strokeWidth={2} />
        <path d="M0 -202l16 4l-16 5Z" fill="#b8322a" />
      </>
    );
  }
  const ruined = variant === 2;
  const top = ruined ? -118 : -150;
  const rings: string[] = [];
  for (let y = -12; y > top + 4; y -= 13) rings.push(`M-26 ${y}Q0 ${y + 8} 26 ${y}`);
  return (
    <>
      <Shadow x={40} y={10} rx={78} ry={26} />
      <path d={`M-26 0L-26 ${top}L26 ${top}L26 0Q0 14 -26 0Z`} fill="url(#t-tower)" />
      <path d={rings.join("")} stroke={STONE.deep} strokeWidth={0.9} fill="none" opacity={0.5} />
      <path d="M-8 2L-8 -22Q0 -32 8 -22L8 4Q0 6 -8 2Z" fill="#2a221a" />
      <rect x={-12} y={-92} width={4} height={14} rx={2} fill="#2a221a" />
      <rect x={6} y={-62} width={4} height={14} rx={2} fill="#2a221a" />
      {ruined ? (
        <>
          <path d={`M-26 ${top}L-18 ${top - 14}L-6 ${top - 6}L4 ${top - 22}L14 ${top - 10}L26 ${top - 2}L26 ${top}Z`} fill="url(#t-tower)" />
          <ellipse cx={0} cy={top} rx={22} ry={7} fill="#3a352c" />
          {rock(rng(9), 7, 34, 14)}
          {rock(rng(10), 5, 48, 6)}
          <ellipse cx={-20} cy={top - 6} rx={8} ry={3} fill={GRASS[1]} />
        </>
      ) : (
        <>
          <path d="M-32 -150L-32 -164L32 -164L32 -150Q0 -140 -32 -150Z" fill="url(#t-tower)" />
          <ellipse cx={0} cy={-164} rx={32} ry={9} fill={STONE.light} />
          <path d="M-32 -164v-8h9v8M-14 -166v-8h9v8M4 -166v-8h9v8M22 -164v-8h10v8" fill={STONE.mid} />
          <polygon points="-34,-166 34,-166 0,-214" fill="#7c3524" />
          <polygon points="-34,-166 -2,-166 0,-214" fill="#b0563a" />
          <path d="M0 -214v-12" stroke={BARK.dark} strokeWidth={2} />
          <path d="M0 -226l18 5l-18 6Z" fill="#c9a84a" />
        </>
      )}
    </>
  );
}

function campArt(variant: number): ReactNode {
  const fireX = variant === 1 ? -40 : 36;
  const fireY = 18;
  const stones: ReactNode[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    stones.push(<ellipse key={k} cx={f1(fireX + Math.cos(a) * 12)} cy={f1(fireY + Math.sin(a) * 7)} rx={3.4} ry={2.4} fill={k < 4 ? STONE.dark : STONE.light} />);
  }
  const tent = (x: number, y: number, s: number, cloth: [string, string, string], key: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={18} y={4} rx={44} ry={14} />
      <polygon points="-24,0 2,-44 20,-52 -6,-8" fill={cloth[2]} />
      <polygon points="2,-44 20,-52 34,-10 28,0" fill={cloth[0]} />
      <polygon points="-24,0 2,-44 28,0" fill={cloth[1]} />
      <polygon points="-4,0 2,-24 8,0" fill="#2a1e14" />
      <path d="M2 -44L2 -50M-24 0l-6 3M28 0l6 3" stroke={BARK.dark} strokeWidth={1.6} />
    </g>
  );
  return (
    <>
      <ellipse cx={fireX} cy={fireY} rx={58} ry={34} fill="url(#t-glow)" />
      <ellipse cx={0} cy={6} rx={70} ry={36} fill="#5a5a34" opacity={0.35} />
      {tent(variant === 1 ? 10 : -22, -4, 1, ["#7c6a48", "#c8b48a", "#e6d6ae"], "a")}
      {variant === 2 && tent(-58, 24, 0.8, ["#5a3a2a", "#9a5a3a", "#c27a4e"], "b")}
      {stones}
      <path d={`M${fireX - 9} ${fireY + 3}L${fireX + 9} ${fireY - 3}M${fireX - 8} ${fireY - 3}L${fireX + 8} ${fireY + 4}`} stroke={BARK.dark} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${fireX - 7} ${fireY}Q${fireX - 8} ${fireY - 14} ${fireX - 1} ${fireY - 26}Q${fireX + 1} ${fireY - 14} ${fireX + 7} ${fireY - 18}Q${fireX + 9} ${fireY - 6} ${fireX + 6} ${fireY}Z`} fill="#e8701e" />
      <path d={`M${fireX - 4} ${fireY}Q${fireX - 4} ${fireY - 10} ${fireX} ${fireY - 17}Q${fireX + 2} ${fireY - 8} ${fireX + 4} ${fireY}Z`} fill="#ffc94a" />
      <path d={`M${fireX - 1.5} ${fireY}Q${fireX - 1} ${fireY - 5} ${fireX} ${fireY - 8}Q${fireX + 1.5} ${fireY - 4} ${fireX + 1.5} ${fireY}Z`} fill="#fff4c4" />
      <path d={`M${fireX + 2} ${fireY - 30}Q${fireX - 6} ${fireY - 44} ${fireX + 4} ${fireY - 56}Q${fireX + 12} ${fireY - 66} ${fireX + 6} ${fireY - 78}`} stroke="#d8d2c4" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.22} />
      <g transform={`translate(${fireX + (variant === 1 ? 30 : -34)} ${fireY + 16}) rotate(-6)`}>
        <Shadow x={3} y={3} rx={20} ry={5} />
        <rect x={-16} y={-7} width={32} height={7} rx={3.5} fill={BARK.mid} />
        <rect x={-16} y={-7} width={32} height={2.6} rx={1.3} fill={BARK.light} />
        <ellipse cx={-16} cy={-3.5} rx={2.4} ry={3.5} fill={WOOD_END.light} />
      </g>
      <g transform={`translate(${fireX + 6} ${fireY - 28 + (variant === 1 ? 52 : 0)})`}>
        <rect x={-8} y={-4} width={20} height={8} rx={4} fill="#8a2a24" />
        <rect x={-8} y={-4} width={20} height={3} rx={1.5} fill="#b8483a" />
      </g>
      <g transform={`translate(${variant === 1 ? 52 : -54} ${variant === 1 ? -14 : 22})`}>
        <Shadow x={6} y={3} rx={12} ry={4} />
        <path d="M-7 0L-7 -14Q0 -17 7 -14L7 0Q0 3 -7 0Z" fill={BARK.mid} />
        <path d="M-7 0L-7 -14Q-3 -15.5 -2 -15.6L-2 1.6Q-5 1 -7 0Z" fill={BARK.light} />
        <ellipse cx={0} cy={-14} rx={7} ry={2.6} fill="#a8804f" />
        <path d="M-7 -4Q0 -1 7 -4M-7 -10Q0 -7 7 -10" stroke="#3a3a3a" strokeWidth={1} fill="none" />
      </g>
    </>
  );
}

function stonesArt(variant: number): ReactNode {
  const rand = rng(701 + variant * 29);
  const count = 7 + variant;
  const rx = 66;
  const ry = rx * 0.62;
  const ring = Array.from({ length: count }, (_, k) => {
    const a = (k / count) * Math.PI * 2 + rand() * 0.2;
    return { x: Math.cos(a) * rx, y: Math.sin(a) * ry, h: 26 + rand() * 16, w: 7 + rand() * 4, lean: (rand() - 0.5) * 6, fallen: variant === 2 && k === 2 };
  }).sort((a, b) => a.y - b.y);
  const stone = (s: (typeof ring)[number], k: number) => {
    if (s.fallen) {
      return (
        <g key={k}>
          <Shadow x={s.x + 6} y={s.y + 4} rx={s.h * 0.7} ry={6} />
          <rect x={f1(s.x - s.h / 2)} y={f1(s.y - 9)} width={f1(s.h)} height={10} rx={4} fill={STONE.mid} />
          <rect x={f1(s.x - s.h / 2)} y={f1(s.y - 9)} width={f1(s.h)} height={4} rx={2} fill={STONE.light} />
        </g>
      );
    }
    const { x, y, h, w, lean } = s;
    const outline = poly([[x - w, y], [x - w * 0.85 + lean, y - h * 0.9], [x + lean * 0.9, y - h], [x + w * 0.8 + lean, y - h * 0.88], [x + w, y]]);
    const lit = poly([[x - w, y], [x - w * 0.85 + lean, y - h * 0.9], [x + lean * 0.9, y - h], [x - w * 0.1 + lean * 0.4, y]]);
    return (
      <g key={k}>
        <Shadow x={x + h * 0.45} y={y + 3} rx={h * 0.6} ry={6} />
        <polygon points={outline} fill={STONE.dark} />
        <polygon points={lit} fill={STONE.mid} />
        <path d={`M${f1(x - w * 0.82 + lean)} ${f1(y - h * 0.88)}L${f1(x + lean * 0.9)} ${f1(y - h)}`} stroke={STONE.light} strokeWidth={2} strokeLinecap="round" />
        <circle cx={f1(x - w * 0.3 + lean * 0.5)} cy={f1(y - h * 0.45)} r={2} fill="#9aa86a" opacity={0.7} />
      </g>
    );
  };
  return (
    <>
      <ellipse cx={0} cy={0} rx={rx + 22} ry={ry + 16} fill="#7c8a54" opacity={0.35} />
      <ellipse cx={0} cy={0} rx={rx - 14} ry={ry - 10} fill="#6a6a48" opacity={0.25} />
      {ring.filter((s) => s.y < 0).map(stone)}
      {variant !== 1 && (
        <g>
          <Shadow x={8} y={6} rx={26} ry={8} />
          <polygon points="-20,0 -16,-10 18,-12 22,-2 16,4 -14,4" fill={STONE.dark} />
          <polygon points="-16,-10 18,-12 14,-16 -12,-15" fill={STONE.light} />
          <polygon points="-20,0 -16,-10 -12,-15 -18,-6" fill={STONE.mid} />
        </g>
      )}
      {ring.filter((s) => s.y >= 0).map(stone)}
    </>
  );
}

function pieceArt(kind: PieceKind, variant: number): ReactNode {
  switch (kind) {
    case "ruins":
      return ruinsArt(variant);
    case "watchtower":
      return towerArt(variant);
    case "camp":
      return campArt(variant);
    case "stones":
      return stonesArt(variant);
    case "woods":
      return null;
  }
}

/** A stone bridge along the x-axis, spanning a river, centred on (0, 0). */
function bridgeArt(): ReactNode {
  const half = 62;
  const w = 19;
  return (
    <>
      <rect x={-half + 6} y={-w + 10} width={half * 2 - 4} height={w * 2} rx={6} fill="#000" opacity={0.28} />
      <path d={`M${-half} ${-w}L${half} ${-w}L${half + 8} ${-w - 6}L${half + 8} ${w + 6}L${half} ${w}L${-half} ${w}L${-half - 8} ${w + 6}L${-half - 8} ${-w - 6}Z`} fill={STONE.mid} />
      <path d={`M${-half + 8} -7h${half * 2 - 16}M${-half + 8} 7h${half * 2 - 16}M-30 ${-w}v${w * 2}M0 ${-w}v${w * 2}M30 ${-w}v${w * 2}`} stroke={STONE.dark} strokeWidth={1} opacity={0.55} />
      <rect x={-half - 4} y={-w - 5} width={half * 2 + 8} height={6} rx={2} fill={STONE.light} />
      <rect x={-half - 4} y={w - 1} width={half * 2 + 8} height={6} rx={2} fill={STONE.dark} />
      <rect x={-half - 4} y={w - 1} width={half * 2 + 8} height={2.4} rx={1.2} fill={STONE.light} />
      <path d={`M-38 ${w + 5}Q0 ${w + 16} 38 ${w + 5}`} stroke={STONE.deep} strokeWidth={3} fill="none" opacity={0.6} />
    </>
  );
}

const BIOME_LIST: Biome[] = ["meadow", "woods", "highlands", "marsh"];
const SCATTER_KINDS: ScatterKind[] = ["rock", "pebbles", "tuft", "dryTuft", "flowers", "log", "reeds", "bush", "autumnBush", "leaves", "puddle"];
const PIECE_KINDS: PieceKind[] = ["ruins", "watchtower", "camp", "stones"];

/** Gradients and one symbol per piece of art. Render once inside the map's SVG. */
export const TableArtDefs = memo(function TableArtDefs() {
  const symbols: ReactNode[] = [];
  for (let v = 0; v < 3; v++) {
    for (const kind of SCATTER_KINDS) symbols.push(<g key={`${kind}-${v}`} id={`t-${kind}-${v}`}>{scatterArt(kind, v)}</g>);
    for (const kind of PIECE_KINDS) symbols.push(<g key={`${kind}-${v}`} id={`t-${kind}-${v}`}>{pieceArt(kind, v)}</g>);
    for (const biome of BIOME_LIST) symbols.push(<g key={`woods-${biome}-${v}`} id={`t-woods-${biome}-${v}`}>{woodsArt(biome, v)}</g>);
  }
  symbols.push(<g key={BRIDGE_KEY} id={`t-${BRIDGE_KEY}`}>{bridgeArt()}</g>);
  return (
    <defs>
      <radialGradient id="t-shadow">
        <stop offset="0" stopColor="#0d0a05" stopOpacity={0.5} />
        <stop offset="0.55" stopColor="#0d0a05" stopOpacity={0.3} />
        <stop offset="1" stopColor="#0d0a05" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="t-glow">
        <stop offset="0" stopColor="#ffb040" stopOpacity={0.55} />
        <stop offset="0.5" stopColor="#ff8a20" stopOpacity={0.18} />
        <stop offset="1" stopColor="#ff8a20" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="t-tower" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#cfc8b6" />
        <stop offset="0.35" stopColor="#a8a190" />
        <stop offset="1" stopColor="#5c574c" />
      </linearGradient>
      {symbols}
    </defs>
  );
});
