import type { MouseEvent, PointerEvent } from "react";
import type { Pos } from "@/lib/types";
import { miniBodyRect, miniImageRect, type Mini } from "@/lib/map/minis";
import { BASE_SQUASH } from "@/lib/map/rings";
import { tagFont, tagRect } from "@/lib/map/tags";

/*
 * The pieces every figure on the table is drawn from: a contact shadow on the
 * felt, rings around the base, the baked mini anchored on its base centre, and
 * a name tag under the base. The table looks the same in light and dark mode
 * (D11), so these colours are fixed rather than themed.
 */

export const SELECTED = "#f59e0b";
const UNFOUGHT = "#ff3b2f";
/** Drop highlights while a hero is dragged over a monster: plain drop vs Shift+drop. */
const DROP_ASSIGN = "#16a34a";
const DROP_SECONDARY = "#7c3aed";

const TAG = { fill: "#1d1a16", text: "#f1d98f", rim: "#c9a24a" };
const ALARM_TAG = { fill: "#7a1515", text: "#ffe1d6", rim: "#ff8a7a" };
const LABEL_FONT = "var(--font-cinzel), Georgia, serif";

const SHADOW_ID = "initiative-contact-shadow";

/** Handlers every figure accepts, so drag and selection can attach. */
export type FigureHandlers = {
  onPointerDown?: (e: PointerEvent<SVGGElement>) => void;
  onClick?: (e: MouseEvent<SVGGElement>) => void;
};

export type BaseRing = "unfought" | "selected" | "assign" | "secondary";

/** A soft shadow on the felt under a base, falling down and to the right, away from the key light. */
export function ContactShadow({ pos, radius }: { pos: Pos; radius: number }) {
  return (
    <ellipse
      cx={pos.x + radius * 0.1}
      cy={pos.y + radius * 0.12}
      rx={radius * 1.18}
      ry={radius * BASE_SQUASH * 1.25}
      fill={`url(#${SHADOW_ID})`}
    />
  );
}

/**
 * One mini standing at `pos` on a base of `radius`. It is hit on its base
 * ellipse and on its body, never on the empty corners of its image.
 */
export function MiniFigure(
  props: FigureHandlers & {
    mini: Mini;
    pos: Pos;
    radius: number;
    /** Current camera scale (screen px per world unit), for constant-size rings. */
    scale: number;
    rings: BaseRing[];
    /** Drawn a little faded (an idle hero). */
    faded?: boolean;
    title: string;
    data: Record<`data-${string}`, string>;
  },
) {
  const { mini, pos, radius, scale, rings, faded, title, data, onPointerDown, onClick } = props;
  const image = miniImageRect(mini, pos, radius);
  const body = miniBodyRect(mini, pos, radius);
  return (
    <g data-figure="" {...data} style={{ cursor: "pointer" }} onPointerDown={onPointerDown} onClick={onClick}>
      <title>{title}</title>
      {rings.map((ring) => (
        <Ring key={ring} kind={ring} pos={pos} radius={radius} scale={scale} />
      ))}
      <image
        href={mini.image}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        preserveAspectRatio="none"
        opacity={faded ? 0.8 : 1}
        style={{ pointerEvents: "none" }}
      />
      <ellipse cx={pos.x} cy={pos.y} rx={radius} ry={radius * BASE_SQUASH} fill="transparent" />
      <rect x={body.x} y={body.y} width={body.width} height={body.height} fill="transparent" />
    </g>
  );
}

function Ring({ kind, pos, radius, scale }: { kind: BaseRing; pos: Pos; radius: number; scale: number }) {
  const px = 1 / scale;
  const pad = (world: number, screen: number) => Math.max(world, screen * px);
  const ellipse = (grow: number) => ({
    cx: pos.x,
    cy: pos.y,
    rx: radius + grow,
    ry: radius * BASE_SQUASH + grow * 0.75,
  });
  switch (kind) {
    case "unfought":
      return (
        <ellipse
          className="initiative-unfought-pulse"
          {...ellipse(pad(6, 5))}
          fill="none"
          stroke={UNFOUGHT}
          strokeWidth={pad(3.5, 3)}
        />
      );
    case "selected":
      return <ellipse {...ellipse(pad(9, 7))} fill="none" stroke={SELECTED} strokeWidth={pad(3.5, 2.5)} />;
    case "assign":
    case "secondary": {
      const color = kind === "assign" ? DROP_ASSIGN : DROP_SECONDARY;
      return (
        <ellipse
          {...ellipse(pad(5, 4))}
          fill={color}
          fillOpacity={0.25}
          stroke={color}
          strokeWidth={pad(4, 3)}
          strokeDasharray={kind === "secondary" ? `${pad(8, 6)} ${pad(5, 4)}` : undefined}
        />
      );
    }
  }
}

/**
 * A slim dark name tag in gold small capitals, hung just below the front of a
 * base, sized by `tagRect` (it keeps at least TAG_MIN_PX on screen). `alarm`
 * turns it red (an unfought monster).
 */
export function NameTag(props: {
  pos: Pos;
  radius: number;
  /** Font size in world units at zoom 1. */
  size: number;
  scale: number;
  alarm?: boolean;
  children: string;
}) {
  const { pos, radius, size, scale, alarm = false, children } = props;
  const tone = alarm ? ALARM_TAG : TAG;
  const fontSize = tagFont(size, scale);
  const { x, y: top, width, height } = tagRect(pos, radius, children, size, scale);
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect
        x={x}
        y={top}
        width={width}
        height={height}
        rx={fontSize * 0.18}
        fill={tone.fill}
        fillOpacity={0.88}
        stroke={tone.rim}
        strokeOpacity={0.45}
        strokeWidth={Math.max(0.6, 0.8 / scale)}
      />
      <text
        x={pos.x}
        y={top + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={600}
        letterSpacing={fontSize * 0.04}
        fill={tone.text}
        style={{ fontFamily: LABEL_FONT }}
      >
        {children}
      </text>
    </g>
  );
}

/** Shared SVG definitions for the figures. Render once, inside the map's SVG. */
export function FigureDefs() {
  return (
    <defs>
      <radialGradient id={SHADOW_ID}>
        <stop offset="0" stopColor="#000" stopOpacity={0.55} />
        <stop offset="0.6" stopColor="#000" stopOpacity={0.38} />
        <stop offset="1" stopColor="#000" stopOpacity={0} />
      </radialGradient>
    </defs>
  );
}

const FIGURE_CSS = `
@keyframes initiative-unfought-pulse {
  0%, 100% { opacity: 0.95; transform: scale(1); }
  50% { opacity: 0.25; transform: scale(1.15); }
}
.initiative-unfought-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: initiative-unfought-pulse 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .initiative-unfought-pulse { animation: none; opacity: 0.9; }
}
`;

/** Keyframes for the figures. Render once, outside the SVG (React hoists and dedupes it). */
export function FigureStyles() {
  return (
    <style href="initiative-figures" precedence="default">
      {FIGURE_CSS}
    </style>
  );
}
