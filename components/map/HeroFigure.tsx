import type { PlacedHero } from "@/lib/map/layout";
import { heroMini } from "@/lib/map/minis";
import { HERO_BASE_RADIUS } from "@/lib/map/rings";
import { MiniFigure, NameTag, type FigureHandlers } from "./MiniFigure";

/** Below this zoom, hero names are hidden (monster names stay) so the map doesn't drown in text. */
const HERO_LABEL_MIN_SCALE = 0.45;

type Props = FigureHandlers & {
  placed: PlacedHero;
  scale: number;
  selected?: boolean;
};

/** A hero: its picked mini (or the neutral adventurer), a little faded while idle. */
export function HeroFigure({ placed, scale, selected, onPointerDown, onClick }: Props) {
  const { hero, pos, targets } = placed;
  const idle = targets.length === 0;
  return (
    <MiniFigure
      mini={heroMini(hero.mini)}
      pos={pos}
      radius={HERO_BASE_RADIUS}
      scale={scale}
      rings={selected ? ["selected"] : []}
      faded={idle}
      title={`${hero.name} (${hero.class}${idle ? ", idle" : ""})`}
      data={{ "data-hero": hero.id }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    />
  );
}

/** A hero's name tag, hidden when zoomed far out. */
export function HeroLabel({ placed, scale }: { placed: PlacedHero; scale: number }) {
  if (scale < HERO_LABEL_MIN_SCALE) return null;
  const idle = placed.targets.length === 0;
  return (
    <NameTag pos={placed.pos} radius={HERO_BASE_RADIUS} size={11} scale={scale}>
      {idle ? `${placed.hero.name} · idle` : placed.hero.name}
    </NameTag>
  );
}
