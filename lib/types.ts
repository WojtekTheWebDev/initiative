export type Pos = { x: number; y: number };
export type Size = "S" | "M" | "L" | "XL";

export type Monster = {
  id: string;
  name: string;
  size: Size;
  pos: Pos;
  notes?: string;
  slain?: string; // 'YYYY-MM-DD', kept as a string, never a Date
  slainBy?: string[]; // hero ids targeting it when slain: main fighters first, then secondary, each by id
  externalKey?: string;
};

export type Hero = {
  id: string;
  name: string;
  class: string; // free-text label, shown as text only
  guild?: string; // free-text team, e.g. "Cloud"; absent = no guild
  mini?: string; // id of a baked hero mini; absent or unknown = the neutral adventurer
  targets: string[]; // ordered; [0] = main, rest = secondary targets; [] = idle
  pos?: Pos; // present only when targets is empty
};

export type World = { monsters: Monster[]; heroes: Hero[] };
