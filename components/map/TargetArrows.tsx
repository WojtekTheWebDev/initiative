import type { WorldLayout } from "@/lib/map/layout";
import { linksOf, type PlacedLink } from "@/lib/map/links";
import { FOCUS_RING, SELECTED, type FigureHandlers } from "./MiniFigure";

/** Screen-px sizes, kept the same at any zoom. */
const MAIN = { width: 3.4, head: 14, headWidth: 13, opacity: 1 };
const SECONDARY = { width: 2.4, head: 11, headWidth: 11, opacity: 0.9, dash: 7, gap: 5 };
/**
 * Gold cord with a thin dark edge, so it reads on every shade of felt, and a
 * soft shadow offset down and to the right (away from the key light).
 */
const CORD = "#ffd96a";
const EDGE = { color: "#2b1d06", opacity: 0.7, width: 1.1 };
const SHADOW = { dx: 1.5, dy: 2, opacity: 0.35, extra: 0.4 };
/** Width of the invisible stroke that catches clicks along an arrow. */
const HIT_WIDTH = 12;
/** Opacity of arrows that don't belong to the selected figure. */
const FADED = 0.22;

type Props = {
  layout: WorldLayout;
  /** Current camera scale (screen px per world unit). */
  scale: number;
  /** The selected figure: its arrows turn amber and every other arrow fades. */
  focus: { kind: "monster" | "hero"; id: string } | null;
  bindLink: (heroId: string, monsterId: string) => FigureHandlers;
};

/**
 * An arrow from every hero to each of its targets, like a gold cord laid on the
 * table: solid for the main target, dashed for secondary ones. Drawn in world
 * space below the figures. Each arrow is a button in the Tab order, and
 * reached with the keyboard it shows a gold halo along its length.
 */
export function TargetArrows({ layout, scale, focus, bindLink }: Props) {
  const names = new Map<string, string>([
    ...layout.heroes.map((h) => [h.hero.id, h.hero.name] as const),
    ...layout.monsters.map((m) => [m.monster.id, m.monster.name] as const),
  ]);
  const isFocused = (l: PlacedLink) =>
    focus !== null && (focus.kind === "hero" ? l.heroId === focus.id : l.monsterId === focus.id);
  // Focused arrows go last, so they sit on top of the faded ones.
  const links = linksOf(layout, scale);
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
  onKeyDown,
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
  const color = state === "focused" ? SELECTED : CORD;
  const opacity = state === "faded" ? FADED : state === "focused" ? 1 : style.opacity;
  const dash = main ? undefined : `${SECONDARY.dash * px} ${SECONDARY.gap * px}`;
  return (
    <g
      data-figure=""
      data-link={`${link.heroId}:${link.monsterId}`}
      role="button"
      tabIndex={0}
      aria-label={title}
      style={{ cursor: "pointer" }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <title>{title}</title>
      <line
        className="initiative-focus-ring"
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={FOCUS_RING}
        strokeOpacity={0.45}
        strokeWidth={HIT_WIDTH * px}
        strokeLinecap="round"
        style={{ pointerEvents: "none" }}
      />
      <g opacity={opacity} strokeLinecap="round" style={{ pointerEvents: "none" }}>
        <g opacity={SHADOW.opacity} transform={`translate(${SHADOW.dx * px} ${SHADOW.dy * px})`}>
          <line
            x1={from.x}
            y1={from.y}
            x2={base.x}
            y2={base.y}
            stroke="#000"
            strokeWidth={(style.width + SHADOW.extra) * px}
            strokeDasharray={dash}
          />
          <polygon points={points} fill="#000" />
        </g>
        <g opacity={EDGE.opacity} stroke={EDGE.color} strokeWidth={2 * EDGE.width * px} strokeLinejoin="round">
          <line
            x1={from.x}
            y1={from.y}
            x2={base.x}
            y2={base.y}
            strokeWidth={(style.width + 2 * EDGE.width) * px}
            strokeDasharray={dash}
          />
          <polygon points={points} fill={EDGE.color} />
        </g>
        <line
          x1={from.x}
          y1={from.y}
          x2={base.x}
          y2={base.y}
          stroke={color}
          strokeWidth={style.width * px}
          strokeDasharray={dash}
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
