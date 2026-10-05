import type { Monster } from "@/lib/types";

/** Slain monsters, newest `slain` date first; same day by name. */
export function trophiesOf(monsters: Monster[]): (Monster & { slain: string })[] {
  return monsters
    .filter((m): m is Monster & { slain: string } => Boolean(m.slain))
    .sort((a, b) =>
      a.slain !== b.slain ? (a.slain < b.slain ? 1 : -1) : a.name.localeCompare(b.name),
    );
}
