import type { PlacedHero } from "@/lib/map/layout";
import { HERO_BASE_RADIUS } from "@/lib/map/rings";
import { heroGlyph } from "@/lib/map/glyphs";
import { FigureLabel, SELECTED, type FigureHandlers } from "./MonsterFigure";

/** Below this zoom, hero names are hidden (monster names stay) so the map doesn't drown in text. */
const HERO_LABEL_MIN_SCALE = 0.45;

type Props = FigureHandlers & {
  placed: PlacedHero;
  scale: number;
  selected?: boolean;
};

export function HeroFigure({ placed, scale, selected, onPointerDown, onClick }: Props) {
  const { hero, pos, mainTarget } = placed;
  const px = 1 / scale;
  const idle = mainTarget === null;
  return (
    <g
      data-figure=""
      data-hero={hero.id}
      transform={`translate(${pos.x} ${pos.y})`}
      style={{ cursor: "pointer" }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <title>{`${hero.name} (${hero.class}${idle ? ", idle" : ""})`}</title>
      {selected && (
        <circle
          r={HERO_BASE_RADIUS + Math.max(5, 4 * px)}
          fill="none"
          stroke={SELECTED}
          strokeWidth={Math.max(3, 2 * px)}
        />
      )}
      <circle
        r={HERO_BASE_RADIUS}
        fill="var(--background)"
        stroke="currentColor"
        strokeOpacity={idle ? 0.4 : 0.75}
        strokeWidth={Math.max(2, 1.5 * px)}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={HERO_BASE_RADIUS * 1.05}
        style={{ pointerEvents: "none" }}
      >
        {heroGlyph(hero.class)}
      </text>
      {scale >= HERO_LABEL_MIN_SCALE && (
        // Engaged heroes stand above or beside their monster, so the label goes
        // above them, away from the monster's base and its name.
        <FigureLabel y={HERO_BASE_RADIUS} size={11} scale={scale} above={!idle}>
          {hero.name}
        </FigureLabel>
      )}
    </g>
  );
}
