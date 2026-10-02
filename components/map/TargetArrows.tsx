import type { WorldLayout } from "@/lib/map/layout";
import { linksOf, type PlacedLink } from "@/lib/map/links";
import { SELECTED, type FigureHandlers } from "./MonsterFigure";

/** Screen-px sizes, kept the same at any zoom. */
const MAIN = { width: 2, head: 10, headWidth: 8, opacity: 0.75 };
const SECONDARY = { width: 1.5, head: 8, headWidth: 6.5, opacity: 0.45, dash: 5, gap: 4 };
/** Width of the invisible stroke that catches clicks along an arrow. */
const HIT_WIDTH = 12;
/** Opacity of arrows that don't belong to the selected figure. */
const FADED = 0.15;

type Props = {
  layout: WorldLayout;
  /** Current camera scale (screen px per world unit). */
  scale: number;
  /** The selected figure: its arrows turn amber and every other arrow fades. */
  focus: { kind: "monster" | "hero"; id: string } | null;
  bindLink: (heroId: string, monsterId: string) => FigureHandlers;
};

/**
 * An arrow from every hero to each of its targets: solid for the main target,
 * dashed and fainter for secondary ones. Drawn in world space below the figures.
 */
export function TargetArrows({ layout, scale, focus, bindLink }: Props) {
  const names = new Map<string, string>([
    ...layout.heroes.map((h) => [h.hero.id, h.hero.name] as const),
    ...layout.monsters.map((m) => [m.monster.id, m.monster.name] as const),
  ]);
  const isFocused = (l: PlacedLink) =>
    focus !== null && (focus.kind === "hero" ? l.heroId === focus.id : l.monsterId === focus.id);
  // Focused arrows go last, so they sit on top of the faded ones.
  const links = linksOf(layout);
  const ordered = focus ? [...links.filter((l) => !isFocused(l)), ...links.filter(isFocused)] : links;
  return (
    <g>
      {ordered.map((l) => (
        <Arrow
          key={`${l.heroId}:${l.monsterId}`}
          link={l}
          scale={scale}
          state={focus === null ? "normal" : isFocused(l) ? "focused" : "faded"}
          title={`${names.get(l.heroId)} → ${names.get(l.monsterId)} (${l.main ? "main" : "secondary"} target)`}
          {...bindLink(l.heroId, l.monsterId)}
        />
      ))}
    </g>
  );
}

function Arrow({
  link,
  scale,
  state,
  title,
  onPointerDown,
  onClick,
}: FigureHandlers & { link: PlacedLink; scale: number; state: "normal" | "focused" | "faded"; title: string }) {
  const { from, to, main } = link;
  const px = 1 / scale;
  const style = main ? MAIN : SECONDARY;
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  // The head never gets longer than the arrow itself.
  const head = Math.min(style.head * px, length);
  const half = ((style.headWidth * px) / 2) * (head / (style.head * px));
  const base = { x: to.x - ux * head, y: to.y - uy * head };
  const points = [
    `${to.x},${to.y}`,
    `${base.x - uy * half},${base.y + ux * half}`,
    `${base.x + uy * half},${base.y - ux * half}`,
  ].join(" ");
  const color = state === "focused" ? SELECTED : "currentColor";
  const opacity = state === "faded" ? FADED : state === "focused" ? 1 : style.opacity;
  return (
    <g
      data-figure=""
      data-link={`${link.heroId}:${link.monsterId}`}
      style={{ cursor: "pointer" }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <title>{title}</title>
      <g opacity={opacity} style={{ pointerEvents: "none" }}>
        <line
          x1={from.x}
          y1={from.y}
          x2={base.x}
          y2={base.y}
          stroke={color}
          strokeWidth={style.width * px}
          strokeDasharray={main ? undefined : `${SECONDARY.dash * px} ${SECONDARY.gap * px}`}
        />
        <polygon points={points} fill={color} />
      </g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="transparent"
        strokeWidth={HIT_WIDTH * px}
        strokeLinecap="round"
        style={{ pointerEvents: "stroke" }}
      />
    </g>
  );
}
