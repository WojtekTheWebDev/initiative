import type { Pos, World } from "@/lib/types";

const SIZES = new Set(["S", "M", "L", "XL"]);

const isPos = (p: unknown): p is Pos =>
  typeof p === "object" &&
  p !== null &&
  Number.isFinite((p as Pos).x) &&
  Number.isFinite((p as Pos).y);

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) (seen.has(id) ? dupes : seen).add(id);
  return [...dupes];
}

/**
 * Problems in a (possibly hand-edited) world. Empty list = valid.
 * Never throws; callers log the messages.
 */
export function validateWorld(world: World): string[] {
  const problems: string[] = [];
  const monsters = new Map(world.monsters.map((m) => [m.id, m]));

  for (const id of duplicates(world.monsters.map((m) => m.id))) {
    problems.push(`Duplicate monster id "${id}"`);
  }
  for (const id of duplicates(world.heroes.map((h) => h.id))) {
    problems.push(`Duplicate hero id "${id}"`);
  }

  for (const m of world.monsters) {
    if (!SIZES.has(m.size)) problems.push(`Monster "${m.id}" has unknown size "${m.size}"`);
    if (!isPos(m.pos)) problems.push(`Monster "${m.id}" has no valid pos`);
    if (m.slainBy !== undefined && !(Array.isArray(m.slainBy) && m.slainBy.every((id) => typeof id === "string"))) {
      problems.push(`Monster "${m.id}" has a slainBy that is not a list of hero ids`);
    }
  }

  for (const h of world.heroes) {
    if (h.guild !== undefined && typeof h.guild !== "string") {
      problems.push(`Hero "${h.id}" has a guild that is not text`);
    }
    // Any text is a valid mini: an id that isn't in the roster only changes the drawing.
    if (h.mini !== undefined && typeof h.mini !== "string") {
      problems.push(`Hero "${h.id}" has a mini that is not text`);
    }
    if (!Array.isArray(h.targets)) {
      problems.push(`Hero "${h.id}" has targets that are not a list`);
      continue;
    }
    for (const id of duplicates(h.targets)) {
      problems.push(`Hero "${h.id}" lists target "${id}" more than once`);
    }
    for (const t of h.targets) {
      const m = monsters.get(t);
      if (!m) problems.push(`Hero "${h.id}" targets missing monster "${t}"`);
      else if (m.slain) problems.push(`Hero "${h.id}" targets slain monster "${t}"`);
    }
    if (h.targets.length > 0 && h.pos !== undefined) {
      problems.push(`Hero "${h.id}" is engaged but has a pos`);
    }
    if (h.targets.length === 0 && !isPos(h.pos)) {
      problems.push(`Hero "${h.id}" is idle but has no valid pos`);
    }
  }

  return problems;
}
