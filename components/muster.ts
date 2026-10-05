import type { Monster, Size } from "@/lib/types";

/** How many muster tokens show before the rest fold into "+N more". */
export const MUSTER_SHOWN = 6;

const SIZE_RANK: Record<Size, number> = { XL: 0, L: 1, M: 2, S: 3 };

/** The muster tokens for a list of unfought monsters. */
export type Muster = {
  /** Tokens shown in full under the wordmark. */
  shown: Monster[];
  /** The rest, listed behind "+N more". */
  folded: Monster[];
};

/**
 * Orders unfought monsters largest first, then by name (ignoring case, then
 * by id, so equal names keep a stable order), and folds everything past the
 * first `MUSTER_SHOWN` into `folded`.
 */
export function muster(unfought: Monster[]): Muster {
  const sorted = [...unfought].sort(
    (a, b) =>
      SIZE_RANK[a.size] - SIZE_RANK[b.size] ||
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return { shown: sorted.slice(0, MUSTER_SHOWN), folded: sorted.slice(MUSTER_SHOWN) };
}
