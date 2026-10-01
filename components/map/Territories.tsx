import type { ViewBox } from "@/lib/map/camera";

const TEAM_TINT = "rgba(225, 90, 60, 0.07)";
const KEEP_TINT = "rgba(70, 120, 230, 0.07)";
const TEAM_COLOR = "#b4432c";
const KEEP_COLOR = "#2f5fb3";

const BANNER_W = 190;
const BANNER_H = 44;
const BANNER_TOP = 14; // screen px from the top of the view
const BANNER_EDGE = 16; // screen px kept clear of the border / view edge

type Props = { viewBox: ViewBox; scale: number };

/**
 * World-space territory layer: side tints, the border at x = 0 (always spanning
 * the visible height, so it looks infinite) and the two banners pinned near the
 * top of the view. Banners keep a constant on-screen size at any zoom.
 */
export function Territories({ viewBox: vb, scale }: Props) {
  const left = vb.x;
  const right = vb.x + vb.width;
  const top = vb.y;
  const px = 1 / scale; // one screen pixel in world units

  const teamVisible = left < 0;
  const keepVisible = right >= 0;

  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      {teamVisible && (
        <rect
          x={left}
          y={top}
          width={Math.min(0, right) - left}
          height={vb.height}
          fill={TEAM_TINT}
        />
      )}
      {keepVisible && (
        <rect
          x={Math.max(0, left)}
          y={top}
          width={right - Math.max(0, left)}
          height={vb.height}
          fill={KEEP_TINT}
        />
      )}

      {left <= 0 && right >= 0 && (
        <g>
          <line
            x1={0}
            x2={0}
            y1={top}
            y2={top + vb.height}
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={10 * px}
          />
          <line
            x1={0}
            x2={0}
            y1={top}
            y2={top + vb.height}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth={2 * px}
            strokeDasharray={`${14 * px} ${8 * px}`}
          />
        </g>
      )}

      {teamVisible && (
        <Banner
          label="Team battlefield"
          icon="⚔️"
          color={TEAM_COLOR}
          centerX={bannerCenter(left, Math.min(0, right), "team", px)}
          y={top + BANNER_TOP * px}
          px={px}
        />
      )}
      {keepVisible && (
        <Banner
          label="Your keep"
          icon="🏰"
          color={KEEP_COLOR}
          centerX={bannerCenter(Math.max(0, left), right, "keep", px)}
          y={top + BANNER_TOP * px}
          px={px}
        />
      )}
    </g>
  );
}

/**
 * Center of the visible part of a side, clamped so the banner stays inside it.
 * When the side is too narrow, the banner hugs the border and slides off-screen.
 */
function bannerCenter(from: number, to: number, side: "team" | "keep", px: number): number {
  const half = (BANNER_W / 2 + BANNER_EDGE) * px;
  if (to - from >= 2 * half) {
    return Math.min(to - half, Math.max(from + half, (from + to) / 2));
  }
  return side === "team" ? to - half : from + half;
}

function Banner(props: {
  label: string;
  icon: string;
  color: string;
  centerX: number;
  y: number;
  px: number;
}) {
  const { label, icon, color, centerX, y, px } = props;
  const w = BANNER_W;
  const h = BANNER_H;
  const notch = 10;
  // A pennant with a swallowtail bottom, drawn in screen pixels.
  const shape = `M0 0 H${w} V${h} L${w / 2 + notch} ${h - notch} H${w / 2 - notch} L0 ${h} Z`;
  return (
    <g transform={`translate(${centerX} ${y}) scale(${px}) translate(${-w / 2} 0)`}>
      <path d={shape} fill={color} fillOpacity={0.88} />
      <path d={shape} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={1} />
      <text
        x={w / 2}
        y={h / 2 - 3}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={15}
        fontWeight={600}
        style={{ letterSpacing: "0.02em" }}
      >
        {icon} {label}
      </text>
    </g>
  );
}
