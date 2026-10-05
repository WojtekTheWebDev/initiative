import type { Monster, Pos } from "@/lib/types";
import { viewBoxOf, type Camera, type ViewBox, type ViewportSize } from "@/lib/map/camera";

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

/** Max random offset (world units, each axis) so new figures don't stack. */
export const SPAWN_JITTER = 30;

type Rand = () => number;

function jitter(rand: Rand): number {
  return (rand() * 2 - 1) * SPAWN_JITTER;
}

export function viewCenter(view: ViewBox): Pos {
  return { x: view.x + view.width / 2, y: view.y + view.height / 2 };
}

/** Where a new hero appears: the view centre, plus jitter. */
export function heroSpawn(view: ViewBox, rand: Rand = Math.random): Pos {
  const c = viewCenter(view);
  return { x: Math.round(c.x + jitter(rand)), y: Math.round(c.y + jitter(rand)) };
}

/** Where a new monster appears: the view centre, plus jitter, the same as a hero. */
export function monsterSpawn(view: ViewBox, rand: Rand = Math.random): Pos {
  return heroSpawn(view, rand);
}

/** Readable text from anything an action threw. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return "Something went wrong";
}
