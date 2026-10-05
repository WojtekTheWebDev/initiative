import { Document, isMap, parseDocument, Scalar, type YAMLMap, type YAMLSeq } from "yaml";
import { validateWorld } from "@/lib/domain/validate";
import type { Hero, Monster, Pos, World } from "@/lib/types";

/**
 * The save file: the whole table as one YAML document, written by Save game
 * and read by Load game. Pure, so it runs in the browser and in Vitest.
 *
 * ```yaml
 * initiative: 1
 * savedAt: 2026-10-05T09:12:44.000Z
 * monsters:
 *   - id: search-rewrite
 *     ...
 * heroes:
 *   - id: ana
 *     ...
 * ```
 */

/** The file format version, written as the `initiative` key. */
export const SAVE_VERSION = 1;

/** Field order of each item, matching `data.example/initiative.yaml`. */
export const MONSTER_FIELDS = ["id", "name", "size", "pos", "notes", "slain", "slainBy", "externalKey"] as const;
export const HERO_FIELDS = ["id", "name", "class", "guild", "mini", "targets", "pos"] as const;

const HEADER = " Initiative save. Open it with Load game in the wordmark menu.";

/** A save file that parsed: the table, when it was saved, and what `validateWorld` found wrong in it. */
export type LoadedSave = { world: World; savedAt?: string; problems: string[] };

/** `initiative-2026-10-05.yaml`, from the local date. */
export function saveFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `initiative-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.yaml`;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** Fields holding a list of ids, written as flow sequences (`[a, b]`). */
const ID_LISTS = new Set(["targets", "slainBy"]);

function fieldNode(doc: Document, key: string, value: unknown) {
  if (key === "pos") return doc.createNode(value, { flow: true });
  if (ID_LISTS.has(key)) {
    const seq = doc.createNode(value) as YAMLSeq;
    seq.flow = true;
    return seq;
  }
  const node = doc.createNode(value) as Scalar;
  if (key === "notes" && typeof value === "string" && value.includes("\n")) node.type = Scalar.BLOCK_LITERAL;
  return node;
}

function itemsNode(doc: Document, items: readonly object[], fields: readonly string[]) {
  const seq = doc.createNode([]) as YAMLSeq;
  items.forEach((item, i) => {
    const map = doc.createNode({}) as YAMLMap;
    const entity = item as Record<string, unknown>;
    for (const key of fields) {
      if (entity[key] !== undefined) map.set(doc.createNode(key), fieldNode(doc, key, entity[key]));
    }
    if (i > 0) (map as { spaceBefore?: boolean }).spaceBefore = true;
    seq.items.push(map);
  });
  return seq;
}

/**
 * The save file for `world`. Items keep their order, fields follow
 * `MONSTER_FIELDS` and `HERO_FIELDS`, `pos` and id lists are one-line flow
 * collections and multi-line notes are block literals, so the file reads like
 * one written by hand.
 */
export function stringifySave(world: World, savedAt: Date): string {
  const doc = new Document({});
  doc.commentBefore = HEADER;
  const root = doc.contents as YAMLMap;
  root.set("initiative", SAVE_VERSION);
  root.set("savedAt", savedAt.toISOString());
  const monsters = doc.createPair("monsters", itemsNode(doc, world.monsters, MONSTER_FIELDS));
  const heroes = doc.createPair("heroes", itemsNode(doc, world.heroes, HERO_FIELDS));
  (monsters.key as Scalar).spaceBefore = true;
  (heroes.key as Scalar).spaceBefore = true;
  root.items.push(monsters, heroes);
  // `yaml` pads flow collections on both sides (`[ a, b ]`); id lists read better unpadded.
  return doc
    .toString({ lineWidth: 0 })
    .replace(/^(\s*(?:- )?(?:targets|slainBy): )\[ ([^\n]*?) \]$/gm, "$1[$2]");
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const str = (v: unknown): string | undefined => (v === undefined || v === null ? undefined : String(v));

function toPos(v: unknown): Pos | undefined {
  if (!v || typeof v !== "object") return undefined;
  const { x, y } = v as { x?: unknown; y?: unknown };
  return { x: Number(x), y: Number(y) };
}

/** Plain items of a list. Non-map entries and maps without an id are skipped, with a problem each. */
function plainItems(list: unknown, key: string, problems: string[]): Record<string, unknown>[] {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) {
    problems.push(`"${key}" is not a list, so it was left out`);
    return [];
  }
  return list.filter((item, i): item is Record<string, unknown> => {
    const ok = !!item && typeof item === "object" && !Array.isArray(item) && str(item.id) !== undefined;
    if (!ok) problems.push(`Item ${i + 1} of "${key}" has no id, so it was left out`);
    return ok;
  });
}

function readMonsters(list: unknown, problems: string[]): Monster[] {
  return plainItems(list, "monsters", problems).map((m) => {
    const monster: Monster = {
      id: String(m.id),
      name: str(m.name) ?? "",
      size: str(m.size) as Monster["size"],
      pos: toPos(m.pos) ?? { x: 0, y: 0 },
    };
    if (m.pos === undefined) problems.push(`Monster "${monster.id}" has no pos, so it stands at the centre`);
    const notes = str(m.notes);
    if (notes !== undefined) monster.notes = notes;
    const slain = str(m.slain);
    if (slain !== undefined) monster.slain = slain;
    if (Array.isArray(m.slainBy)) monster.slainBy = m.slainBy.map(String);
    const externalKey = str(m.externalKey);
    if (externalKey !== undefined) monster.externalKey = externalKey;
    return monster;
  });
}

function readHeroes(list: unknown, problems: string[]): Hero[] {
  return plainItems(list, "heroes", problems).map((h) => {
    const hero: Hero = {
      id: String(h.id),
      name: str(h.name) ?? "",
      class: str(h.class) ?? "",
      targets: Array.isArray(h.targets) ? h.targets.map(String) : [],
    };
    const guild = str(h.guild);
    if (guild !== undefined) hero.guild = guild;
    const mini = str(h.mini);
    if (mini !== undefined) hero.mini = mini;
    const pos = toPos(h.pos);
    if (pos) hero.pos = pos;
    return hero;
  });
}

/**
 * Reads a save file. Throws an `Error` saying what is wrong, with the line,
 * when the text is not YAML or not a save file; then nothing should load.
 * Smaller problems (a hero targeting a monster that isn't in the file, a
 * missing pos) don't stop it: they are returned in `problems`.
 */
export function parseSave(text: string): LoadedSave {
  // Default YAML 1.2 core schema: `2026-09-28` stays a string (no timestamp tag).
  const doc = parseDocument(text, { prettyErrors: true });
  if (doc.errors.length > 0) {
    const e = doc.errors[0];
    const line = e.linePos?.[0].line;
    throw new Error(`${line ? `Line ${line}: ` : ""}${e.message.split("\n")[0]}`);
  }
  if (!isMap(doc.contents) || !doc.has("initiative")) {
    throw new Error("This isn't a game saved by Initiative");
  }
  const version = doc.get("initiative");
  if (version !== SAVE_VERSION) {
    throw new Error(`This save is format ${String(version)}; this version of Initiative reads format ${SAVE_VERSION}`);
  }

  const js = doc.toJS() as Record<string, unknown>;
  const problems: string[] = [];
  const world: World = {
    monsters: readMonsters(js.monsters, problems),
    heroes: readHeroes(js.heroes, problems),
  };
  problems.push(...validateWorld(world));
  const savedAt = str(js.savedAt);
  return savedAt === undefined ? { world, problems } : { world, savedAt, problems };
}

/** The counts the load dialog compares: living monsters, heroes and trophies. */
export function tableCounts(world: World): { monsters: number; heroes: number; trophies: number } {
  const trophies = world.monsters.filter((m) => m.slain).length;
  return { monsters: world.monsters.length - trophies, heroes: world.heroes.length, trophies };
}
