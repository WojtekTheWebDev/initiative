import Image from "next/image";
import type { Mini } from "@/lib/map/minis";

/** The felt disc behind a portrait, matching the table. */
const FELT = "#4d6a3a";
/** The disc behind a bronzed trophy. */
const BRONZE_DISC = "#4a3520";
/** Turns the painted mini into a cast bronze figure. */
const BRONZE_FILTER = "sepia(1) saturate(1.5) hue-rotate(-12deg) brightness(0.82) contrast(1.1)";

const RINGS = {
  red: "ring-2 ring-hud-danger",
  gold: "ring-2 ring-hud-gold",
} as const;

/**
 * A baked mini shown small, outside the map (figure card, muster tokens,
 * dialogs, trophy shelf and hall). It stands on a disc of felt, so it reads
 * the same as on the table. `bronze` tints it as a trophy; `ring` puts a red
 * (unfought) or gold (selected) ring around the disc. Decorative: name the
 * figure in the text or control around it.
 */
export function Portrait({
  mini,
  size,
  bronze = false,
  ring,
  className = "",
}: {
  mini: Mini;
  size: number;
  bronze?: boolean;
  ring?: keyof typeof RINGS;
  className?: string;
}) {
  // Fit the whole image (base included) inside the disc, keeping its shape.
  const fit = (size * 0.92) / Math.max(mini.width, mini.height);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] ${ring ? RINGS[ring] : ""} ${className}`}
      style={{ width: size, height: size, background: bronze ? BRONZE_DISC : FELT }}
    >
      <Image
        src={mini.image}
        alt=""
        width={Math.round(mini.width * fit)}
        height={Math.round(mini.height * fit)}
        unoptimized
        draggable={false}
        className="pointer-events-none mb-[4%] select-none"
        style={bronze ? { filter: BRONZE_FILTER } : undefined}
      />
    </span>
  );
}
