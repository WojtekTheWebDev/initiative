export type Pos = { x: number; y: number };
export type Size = "S" | "M" | "L" | "XL";

export type Monster = {
  id: string;
  name: string;
  size: Size;
  pos: Pos;
  notes?: string;
  slain?: string; // 'YYYY-MM-DD', kept as a string, never a Date
  externalKey?: string;
};

export type Hero = {
  id: string;
  name: string;
  class: string;
  targets: string[]; // ordered; [0] = main, rest = secondary targets; [] = idle
  pos?: Pos; // present only when targets is empty
};

export type World = { monsters: Monster[]; heroes: Hero[] };
