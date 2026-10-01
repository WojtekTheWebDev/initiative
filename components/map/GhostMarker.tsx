import type { PlacedGhost } from "@/lib/map/layout";
import { GHOST_RADIUS } from "@/lib/map/layout";
import { heroGlyph } from "@/lib/map/glyphs";
import type { FigureHandlers } from "./MonsterFigure";

type Props = FigureHandlers & {
  placed: PlacedGhost;
  scale: number;
};

/** A faint marker for a hero's secondary target. Clicking it is wired up by the Board (T6: popover). */
export function GhostMarker({ placed, scale, onPointerDown, onClick }: Props) {
  const { hero, monsterId, pos } = placed;
  const px = 1 / scale;
  return (
    <g
      data-figure=""
      data-ghost={`${hero.id}:${monsterId}`}
      transform={`translate(${pos.x} ${pos.y})`}
      className="opacity-70 transition-opacity hover:opacity-100"
      style={{ cursor: "pointer" }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <title>{`${hero.name} (also on this)`}</title>
      <circle
        r={GHOST_RADIUS}
        fill="var(--background)"
        fillOpacity={0.6}
        stroke="currentColor"
        strokeWidth={Math.max(1.5, 1.25 * px)}
        strokeDasharray={`${Math.max(3, 3 * px)} ${Math.max(2.5, 2.5 * px)}`}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={GHOST_RADIUS * 1.1}
        style={{ pointerEvents: "none" }}
      >
        {heroGlyph(hero.class)}
      </text>
    </g>
  );
}
