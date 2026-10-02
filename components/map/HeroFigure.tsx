import type { PlacedHero } from "@/lib/map/layout";
import { heroMini } from "@/lib/map/minis";
import { HERO_BASE_RADIUS } from "@/lib/map/rings";
import { HERO_TAG_FONT, heroTagText } from "@/lib/map/tags";
import { MiniFigure, NameTag, type FigureHandlers } from "./MiniFigure";

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

/** A hero's name tag (the board leaves it out when zoomed far out; see `shownTags`). */
export function HeroLabel({ placed, scale }: { placed: PlacedHero; scale: number }) {
  const idle = placed.targets.length === 0;
  return (
    <NameTag pos={placed.pos} radius={HERO_BASE_RADIUS} size={HERO_TAG_FONT} scale={scale}>
      {heroTagText(placed.hero.name, idle)}
    </NameTag>
  );
}
