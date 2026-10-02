import type { Monster, Pos, Territory, World } from "@/lib/types";
import { viewBoxOf, type Camera, type ViewBox, type ViewportSize } from "@/lib/map/camera";

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

/**
 * The part of the map the user can actually see, in world units.
 * `occludedRight` screen px on the right are covered (by the side panel); ignored
 * when the viewport is too narrow for that to leave much behind.
 */
export function visibleViewBox(
  camera: Camera,
  viewport: ViewportSize,
  occludedRight = 0,
): ViewBox {
  const covered = viewport.width > occludedRight * 2 ? occludedRight : 0;
  return viewBoxOf(camera, { width: viewport.width - covered, height: viewport.height });
}

/** Monster spawns stay at least this far (world units) from the x = 0 border. */
export const BORDER_MARGIN = 80;
/** Max random offset (world units, each axis) so new figures don't stack. */
export const SPAWN_JITTER = 30;

type Rand = () => number;

function jitter(rand: Rand): number {
  return (rand() * 2 - 1) * SPAWN_JITTER;
}

export function viewCenter(view: ViewBox): Pos {
  return { x: view.x + view.width / 2, y: view.y + view.height / 2 };
}

/**
 * Where a new monster appears: the centre of the visible part of `side`,
 * plus jitter. Team is always x < 0 and keep x >= 0 (at least BORDER_MARGIN
 * from the border), even when the view shows only the other side.
 */
export function monsterSpawn(view: ViewBox, side: Territory, rand: Rand = Math.random): Pos {
  // Work in "distance into the chosen side": d = -x for team, x for keep.
  const sign = side === "team" ? -1 : 1;
  const near = Math.max(0, Math.min(sign * view.x, sign * (view.x + view.width)));
  const far = Math.max(sign * view.x, sign * (view.x + view.width));
  const j = jitter(rand);
  let d = far > near ? (near + far) / 2 + j : -Infinity;
  // Not visible, or too close to the border: just inside the margin, still jittered.
  if (d < BORDER_MARGIN) d = BORDER_MARGIN + Math.abs(j);
  return { x: Math.round(sign * d), y: Math.round(view.y + view.height / 2 + jitter(rand)) };
}

/** Where a new hero appears: the view centre, plus jitter. */
export function heroSpawn(view: ViewBox, rand: Rand = Math.random): Pos {
  const c = viewCenter(view);
  return { x: Math.round(c.x + jitter(rand)), y: Math.round(c.y + jitter(rand)) };
}

/** Readable text from anything an action threw. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return "Something went wrong";
}
