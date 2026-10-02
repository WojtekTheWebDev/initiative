import Image from "next/image";
import type { Mini } from "@/lib/map/minis";

/**
 * A baked mini shown small, outside the map (side panel, alarm, trophies, the
 * hero form's picker). It stands on a disc of felt, so it reads the same as
 * on the table in light and dark mode.
 */
export function MiniPortrait({ mini, size, className = "" }: { mini: Mini; size: number; className?: string }) {
  // Fit the whole image (base included) inside the disc, keeping its shape.
  const fit = (size * 0.92) / Math.max(mini.width, mini.height);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#4d6a3a] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={mini.image}
        alt=""
        width={Math.round(mini.width * fit)}
        height={Math.round(mini.height * fit)}
        unoptimized
        draggable={false}
        className="pointer-events-none mb-[4%] select-none"
      />
    </span>
  );
}
