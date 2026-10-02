import type { PointerEvent, MouseEvent } from "react";
import type { PlacedMonster } from "@/lib/map/layout";
import { monsterGlyph } from "@/lib/map/glyphs";

/** Neutral stone base, themed in globals.css so it reads in light and dark mode. */
const RIM = "var(--monster-rim)";
const FILL = "var(--monster-fill)";
const UNFOUGHT = "#dc2626";
export const SELECTED = "#f59e0b";
/** Drop highlights while a hero is dragged over a monster: plain drop vs Shift+drop. */
const DROP_ASSIGN = "#16a34a";
const DROP_GHOST = "#7c3aed";

/** Labels never get smaller than this on screen, however far you zoom out. */
const MIN_LABEL_PX = 11;

/** Handlers every figure accepts, so drag (T6) and selection can attach. */
export type FigureHandlers = {
  onPointerDown?: (e: PointerEvent<SVGGElement>) => void;
  onClick?: (e: MouseEvent<SVGGElement>) => void;
};

type Props = FigureHandlers & {
  placed: PlacedMonster;
  /** Current camera scale (screen px per world unit), for constant-size strokes and labels. */
  scale: number;
  selected?: boolean;
  /** A hero is being dragged over this monster: "assign" (plain drop) or "ghost" (Shift held). */
  dropHint?: "assign" | "ghost" | null;
};

export function MonsterFigure({ placed, scale, selected, dropHint, onPointerDown, onClick }: Props) {
  const { monster, pos, radius, unfought } = placed;
  const px = 1 / scale;
  return (
    <g
      data-figure=""
      data-monster={monster.id}
      transform={`translate(${pos.x} ${pos.y})`}
      style={{ cursor: "pointer" }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <title>{unfought ? `${monster.name} (unfought)` : monster.name}</title>
      {unfought && (
        <circle
          className="initiative-unfought-pulse"
          r={radius + Math.max(5, 4 * px)}
          fill="none"
          stroke={UNFOUGHT}
          strokeWidth={Math.max(4, 3 * px)}
        />
      )}
      {selected && (
        <circle
          r={radius + Math.max(9, 7 * px)}
          fill="none"
          stroke={SELECTED}
          strokeWidth={Math.max(3, 2 * px)}
        />
      )}
      {dropHint && (
        <circle
          r={radius + Math.max(6, 5 * px)}
          fill={dropHint === "assign" ? DROP_ASSIGN : DROP_GHOST}
          fillOpacity={0.15}
          stroke={dropHint === "assign" ? DROP_ASSIGN : DROP_GHOST}
          strokeWidth={Math.max(4, 3 * px)}
          strokeDasharray={dropHint === "ghost" ? `${Math.max(8, 6 * px)} ${Math.max(5, 4 * px)}` : undefined}
        />
      )}
      <circle r={radius} fill={FILL} stroke={RIM} strokeWidth={Math.max(3, 1.5 * px)} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius * 1.15}
        style={{ pointerEvents: "none" }}
      >
        {monsterGlyph(monster.size)}
      </text>
      <FigureLabel y={radius} size={14} scale={scale} weight={600}>
        {monster.name}
      </FigureLabel>
    </g>
  );
}

/**
 * A name label whose top edge sits `y` world units below the figure's center
 * (or, with `above`, whose baseline sits `y` above it).
 * It keeps at least MIN_LABEL_PX on screen, and has a halo so it stays readable
 * over the grid and other figures.
 */
export function FigureLabel(props: {
  y: number;
  size: number;
  scale: number;
  weight?: number;
  /** Put the label above the figure instead (baseline at -y). */
  above?: boolean;
  children: string;
}) {
  const { y, size, scale, weight = 500, above = false, children } = props;
  const fontSize = Math.max(size, MIN_LABEL_PX / scale);
  const gap = Math.max(4, 3 / scale);
  return (
    <text
      y={above ? -(y + gap) : y + gap}
      textAnchor="middle"
      dominantBaseline={above ? "auto" : "hanging"}
      fontSize={fontSize}
      fontWeight={weight}
      fill="currentColor"
      stroke="var(--background)"
      strokeWidth={fontSize * 0.28}
      strokeLinejoin="round"
      paintOrder="stroke"
      style={{ pointerEvents: "none" }}
    >
      {children}
    </text>
  );
}

const FIGURE_CSS = `
@keyframes initiative-unfought-pulse {
  0%, 100% { opacity: 0.95; transform: scale(1); }
  50% { opacity: 0.2; transform: scale(1.22); }
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
