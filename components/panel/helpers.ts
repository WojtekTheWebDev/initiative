import type { Monster, World } from "@/lib/types";

/** What is selected on the map. Mirrors Board's `Selection`. */
export type PanelSelection = { kind: "monster" | "hero"; id: string } | null;

/**
 * The selection if it still points at a living monster or an existing hero,
 * otherwise `null` (the item was slain or deleted, maybe by hand in the YAML).
 */
export function liveSelection<S extends PanelSelection>(world: World, selection: S): S | null {
  if (!selection) return null;
  if (selection.kind === "monster") {
    return world.monsters.some((m) => m.id === selection.id && !m.slain) ? selection : null;
  }
  return world.heroes.some((h) => h.id === selection.id) ? selection : null;
}

/** Slain monsters, newest `slain` date first; same day by name. */
export function trophiesOf(monsters: Monster[]): (Monster & { slain: string })[] {
  return monsters
    .filter((m): m is Monster & { slain: string } => Boolean(m.slain))
    .sort((a, b) =>
      a.slain !== b.slain ? (a.slain < b.slain ? 1 : -1) : a.name.localeCompare(b.name),
    );
}

/** Readable text from anything an action threw. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return "Something went wrong";
}
