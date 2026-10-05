import type { Hero, Monster, World } from "@/lib/types";

/** How many party tokens show before the rest fold into "+N more". */
export const PARTY_SHOWN = 6;

/** One hero in the party roster. */
export type PartyMember = {
  hero: Hero;
  /** The main target; absent while the hero is idle. */
  main?: Monster;
  /** How many secondary targets the hero has. */
  secondary: number;
};

/** The party roster for a world. */
export type Party = {
  /** Tokens shown in full under the create buttons. */
  shown: PartyMember[];
  /** The rest, listed behind "+N more". */
  folded: PartyMember[];
  /** How many heroes are idle. */
  idle: number;
};

const byName = (a: Hero, b: Hero) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Every hero with their main target and how many secondary targets they
 * have. Targets that aren't living monsters are skipped, so a hero whose
 * targets are all missing counts as idle. Engaged heroes come first, then
 * idle ones, each by name (ignoring case, then by id). Everything past the
 * first `PARTY_SHOWN` folds into `folded`.
 */
export function party(world: World): Party {
  const living = new Map(world.monsters.filter((m) => !m.slain).map((m) => [m.id, m]));
  const members = [...world.heroes].sort(byName).map((hero): PartyMember => {
    const [main, ...rest] = hero.targets.flatMap((id) => living.get(id) ?? []);
    return { hero, main, secondary: rest.length };
  });
  const sorted = [...members.filter((m) => m.main), ...members.filter((m) => !m.main)];
  return {
    shown: sorted.slice(0, PARTY_SHOWN),
    folded: sorted.slice(PARTY_SHOWN),
    idle: members.length - members.filter((m) => m.main).length,
  };
}
