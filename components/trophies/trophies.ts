import type { Monster, World } from "@/lib/types";

export type Trophy = Monster & { slain: string };

/** A slain monster as its plaque in the trophy hall shows it. */
export type Plaque = {
  monster: Trophy;
  /** The first non-empty line of the notes, if any. */
  note?: string;
  /** Names of the heroes in `slainBy`, in that order; ids of deleted heroes are skipped. */
  by: string[];
};

/** The plaques of one calendar month. */
export type MonthGroup = {
  /** "YYYY-MM". */
  month: string;
  /** e.g. "October 2026". */
  label: string;
  plaques: Plaque[];
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Slain monsters, newest `slain` date first; same day by name. */
export function trophiesOf(monsters: Monster[]): Trophy[] {
  return monsters
    .filter((m): m is Trophy => Boolean(m.slain))
    .sort((a, b) =>
      a.slain !== b.slain ? (a.slain < b.slain ? 1 : -1) : a.name.localeCompare(b.name),
    );
}

/** "October 2026" for "2026-10"; anything else is shown as it is. */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  const name = MONTHS[Number(m) - 1];
  return name && year ? `${name} ${year}` : month;
}

/** "5 October 2026" for "2026-10-05"; anything else is shown as it is. */
export function dayLabel(date: string): string {
  const [year, m, day] = date.split("-");
  const name = MONTHS[Number(m) - 1];
  return name && year && day ? `${Number(day)} ${name} ${year}` : date;
}

/** Every trophy as a plaque, grouped by month of `slain`, newest month and newest trophy first. */
export function trophyHall(world: World): MonthGroup[] {
  const names = new Map(world.heroes.map((h) => [h.id, h.name]));
  const groups: MonthGroup[] = [];
  for (const monster of trophiesOf(world.monsters)) {
    const month = monster.slain.slice(0, 7);
    let group = groups.at(-1);
    if (group?.month !== month) {
      group = { month, label: monthLabel(month), plaques: [] };
      groups.push(group);
    }
    const note = monster.notes
      ?.split("\n")
      .map((line) => line.trim())
      .find(Boolean);
    const by = (monster.slainBy ?? []).flatMap((id) => names.get(id) ?? []);
    group.plaques.push(note ? { monster, note, by } : { monster, by });
  }
  return groups;
}
