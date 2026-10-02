import type { PlacedMonster } from "@/lib/map/layout";
import { monsterMini } from "@/lib/map/minis";
import { MONSTER_TAG_FONT } from "@/lib/map/tags";
import { MiniFigure, NameTag, type BaseRing, type FigureHandlers } from "./MiniFigure";

type Props = FigureHandlers & {
  placed: PlacedMonster;
  /** Current camera scale (screen px per world unit). */
  scale: number;
  selected?: boolean;
  /** A hero is being dragged over this monster: "assign" (plain drop) or "secondary" (Shift held). */
  dropHint?: "assign" | "secondary" | null;
};

/** A monster: the mini for its size, ringed red while unfought. */
export function MonsterFigure({ placed, scale, selected, dropHint, onPointerDown, onClick }: Props) {
  const { monster, pos, radius, unfought } = placed;
  const rings: BaseRing[] = [];
  if (unfought) rings.push("unfought");
  if (dropHint) rings.push(dropHint);
  if (selected) rings.push("selected");
  return (
    <MiniFigure
      mini={monsterMini(monster.size)}
      pos={pos}
      radius={radius}
      scale={scale}
      rings={rings}
      title={unfought ? `${monster.name} (unfought)` : monster.name}
      data={{ "data-monster": monster.id }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    />
  );
}

/** A monster's name tag, red while it is unfought. */
export function MonsterLabel({ placed, scale }: { placed: PlacedMonster; scale: number }) {
  return (
    <NameTag pos={placed.pos} radius={placed.radius} size={MONSTER_TAG_FONT} scale={scale} alarm={placed.unfought}>
      {placed.monster.name}
    </NameTag>
  );
}
