import type { Size } from "@/lib/types";

/** S goblin, M orc (ogre emoji), L troll, XL dragon. */
const MONSTER_GLYPHS: Record<Size, string> = { S: "👺", M: "👹", L: "🧌", XL: "🐉" };

export function monsterGlyph(size: Size): string {
  return MONSTER_GLYPHS[size];
}

/** Known hero classes and their glyphs, in display order (used for the class datalist). */
export const HERO_CLASS_GLYPHS = {
  commander: "👑",
  warrior: "⚔️",
  archer: "🏹",
  mage: "🧙",
  rogue: "🗡️",
  cleric: "✨",
  paladin: "🔱",
  ranger: "🌲",
  druid: "🌿",
  bard: "🎻",
  monk: "🥋",
  ninja: "🥷",
  artificer: "🔧",
  alchemist: "⚗️",
  scout: "🔭",
  necromancer: "💀",
} as const satisfies Record<string, string>;

export type HeroClass = keyof typeof HERO_CLASS_GLYPHS;

export const HERO_CLASSES = Object.keys(HERO_CLASS_GLYPHS) as HeroClass[];

/** Glyph for any class label that isn't in the table. */
export const FALLBACK_HERO_GLYPH = "🛡️";

/** Common synonyms, so free-text labels still get a sensible glyph. */
const ALIASES: Record<string, HeroClass> = {
  wizard: "mage",
  sorcerer: "mage",
  fighter: "warrior",
  barbarian: "warrior",
  knight: "warrior",
  thief: "rogue",
  assassin: "rogue",
  priest: "cleric",
  healer: "cleric",
  captain: "commander",
  leader: "commander",
  lead: "commander",
  hunter: "ranger",
  engineer: "artificer",
  tinkerer: "artificer",
};

/** Glyph for a hero class label. Case and surrounding whitespace are ignored. */
export function heroGlyph(heroClass: string): string {
  const key = heroClass.trim().toLowerCase();
  const cls = Object.hasOwn(HERO_CLASS_GLYPHS, key)
    ? (key as HeroClass)
    : Object.hasOwn(ALIASES, key)
      ? ALIASES[key]
      : undefined;
  return cls ? HERO_CLASS_GLYPHS[cls] : FALLBACK_HERO_GLYPH;
}
