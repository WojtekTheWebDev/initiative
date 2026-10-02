import {
  type Document,
  isMap,
  isScalar,
  isSeq,
  Scalar,
  YAMLMap,
  YAMLSeq,
} from "yaml";
import type { Hero, Monster, Pos } from "@/lib/types";

/**
 * Pure helpers that convert between YAML `Document`s and plain domain objects,
 * and sync a changed list of entities back onto an existing `Document` so that
 * hand-written comments and formatting on untouched nodes survive.
 */

type Entity = { id: string } & Record<string, unknown>;

/** Field order used when a new item is appended, matching `data.example/`. */
export const MONSTER_FIELDS = ["id", "name", "size", "pos", "notes", "slain", "externalKey"] as const;
export const HERO_FIELDS = ["id", "name", "class", "mini", "targets", "pos"] as const;

/** Stringify options shared by every write. `lineWidth: 0` stops long lines being folded. */
export const STRINGIFY_OPTIONS = { lineWidth: 0 } as const;

const str = (v: unknown): string | undefined =>
  v === undefined || v === null ? undefined : String(v);

function toPos(v: unknown): Pos | undefined {
  if (!v || typeof v !== "object") return undefined;
  const { x, y } = v as { x?: unknown; y?: unknown };
  return { x: Number(x), y: Number(y) };
}

/** Plain items of the top-level sequence. Non-map entries and maps without an id are skipped. */
function plainItems(doc: Document, file: string, problems: string[]): Record<string, unknown>[] {
  const js: unknown = doc.toJS();
  if (js === null || js === undefined) return [];
  if (!Array.isArray(js)) {
    problems.push(`${file}: top level is not a list; ignoring its contents`);
    return [];
  }
  return js.filter((item, i): item is Record<string, unknown> => {
    const ok = !!item && typeof item === "object" && !Array.isArray(item) && str(item.id) !== undefined;
    if (!ok) problems.push(`${file}: item ${i} has no id; skipped`);
    return ok;
  });
}

export function monstersFromDoc(doc: Document, problems: string[] = []): Monster[] {
  return plainItems(doc, "monsters.yaml", problems).map((m) => {
    const monster: Monster = {
      id: String(m.id),
      name: str(m.name) ?? "",
      size: str(m.size) as Monster["size"],
      pos: toPos(m.pos) ?? { x: 0, y: 0 },
    };
    if (m.pos === undefined) problems.push(`monsters.yaml: ${monster.id} has no pos`);
    const notes = str(m.notes);
    if (notes !== undefined) monster.notes = notes;
    const slain = str(m.slain);
    if (slain !== undefined) monster.slain = slain;
    const externalKey = str(m.externalKey);
    if (externalKey !== undefined) monster.externalKey = externalKey;
    return monster;
  });
}

export function heroesFromDoc(doc: Document, problems: string[] = []): Hero[] {
  return plainItems(doc, "heroes.yaml", problems).map((h) => {
    const hero: Hero = {
      id: String(h.id),
      name: str(h.name) ?? "",
      class: str(h.class) ?? "",
      targets: Array.isArray(h.targets) ? h.targets.map(String) : [],
    };
    const mini = str(h.mini);
    if (mini !== undefined) hero.mini = mini;
    const pos = toPos(h.pos);
    if (pos) hero.pos = pos;
    return hero;
  });
}

// ---------------------------------------------------------------------------
// Sync back onto the Document
// ---------------------------------------------------------------------------

function sameArray(a: unknown, b: readonly unknown[]): boolean {
  return Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);
}

function notesNode(doc: Document, value: string): Scalar {
  const node = doc.createNode(value) as Scalar;
  if (value.includes("\n")) node.type = Scalar.BLOCK_LITERAL;
  return node;
}

/** Builds the YAML node for one field of a new item, or for a replaced field. */
function fieldNode(doc: Document, key: string, value: unknown, flow = true) {
  if (key === "pos") return doc.createNode(value, { flow: true });
  if (key === "targets") {
    const seq = doc.createNode(value) as YAMLSeq;
    seq.flow = flow;
    return seq;
  }
  if (key === "notes" && typeof value === "string") return notesNode(doc, value);
  return doc.createNode(value);
}

/**
 * Sets `key` on a map node. A key the node doesn't have yet goes in its place
 * in `fields` order (e.g. a new `mini` lands after `class`), not at the end.
 */
function setField(doc: Document, node: YAMLMap, key: string, value: unknown, fields: readonly string[]) {
  if (node.has(key)) {
    node.set(key, value);
    return;
  }
  const rank = fields.indexOf(key);
  const at = node.items.findIndex((pair) => {
    const k = isScalar(pair.key) ? pair.key.value : pair.key;
    return fields.indexOf(String(k)) > rank;
  });
  const pair = doc.createPair(key, value);
  if (at === -1) node.items.push(pair);
  else node.items.splice(at, 0, pair);
}

/** Applies `entity` onto an existing map node. Returns true if anything changed. */
function syncItem(doc: Document, node: YAMLMap, entity: Entity, fields: readonly string[]): boolean {
  let changed = false;
  for (const key of fields) {
    const value = entity[key];
    const current = node.get(key, true);

    if (value === undefined) {
      if (node.has(key)) {
        node.delete(key);
        changed = true;
      }
      continue;
    }

    if (key === "pos") {
      const pos = value as Pos;
      if (isMap(current)) {
        // Mutate in place so the flow/block style and comments of the node stay.
        for (const axis of ["x", "y"] as const) {
          if (current.get(axis) !== pos[axis]) {
            current.set(axis, pos[axis]);
            changed = true;
          }
        }
      } else {
        setField(doc, node, key, fieldNode(doc, key, pos), fields);
        changed = true;
      }
      continue;
    }

    if (key === "targets") {
      const targets = value as string[];
      if (!isSeq(current) || !sameArray(current.toJSON(), targets)) {
        const seq = fieldNode(doc, key, targets, isSeq(current) ? !!current.flow : true);
        if (isSeq(current)) seq.comment = current.comment;
        node.set(key, seq);
        changed = true;
      }
      continue;
    }

    if (isScalar(current)) {
      if (current.value === value) continue;
      // Keep the node (and its comments); only swap the value and fix the style.
      current.value = value;
      const multiline = typeof value === "string" && value.includes("\n");
      if (key === "notes" && multiline) current.type = Scalar.BLOCK_LITERAL;
      else if (!multiline && (current.type === Scalar.BLOCK_LITERAL || current.type === Scalar.BLOCK_FOLDED)) {
        current.type = undefined;
      }
      changed = true;
      continue;
    }

    setField(doc, node, key, fieldNode(doc, key, value), fields);
    changed = true;
  }
  return changed;
}

function newItem(doc: Document, entity: Entity, fields: readonly string[]): YAMLMap {
  const map = new YAMLMap();
  for (const key of fields) {
    if (entity[key] !== undefined) map.set(doc.createNode(key), fieldNode(doc, key, entity[key]));
  }
  return map;
}

/**
 * Syncs `entities` onto the top-level sequence of `doc`, matching items by id.
 * Existing items keep their order and nodes; new ones are appended; items whose
 * id is gone are removed (with their comments). Items the store could not read
 * (non-maps, maps without an id) are left alone.
 *
 * Returns true if the document changed.
 */
export function syncDoc(doc: Document, entities: readonly Entity[], fields: readonly string[]): boolean {
  if (!isSeq(doc.contents)) doc.contents = doc.createNode([]);
  const seq = doc.contents as YAMLSeq;
  let changed = false;

  // Queue of entities per id, so duplicate ids pair up with nodes in order.
  const byId = new Map<string, Entity[]>();
  for (const e of entities) {
    const list = byId.get(e.id);
    if (list) list.push(e);
    else byId.set(e.id, [e]);
  }

  const kept: unknown[] = [];
  for (const item of seq.items) {
    const id = isMap(item) ? str(item.get("id")) : undefined;
    if (!isMap(item) || id === undefined) {
      kept.push(item);
      continue;
    }
    const entity = byId.get(id)?.shift();
    if (!entity) {
      changed = true; // removed
      continue;
    }
    if (syncItem(doc, item, entity, fields)) changed = true;
    kept.push(item);
  }

  const spaced = seq.items.some((i) => (i as { spaceBefore?: boolean }).spaceBefore);
  for (const e of entities) {
    const queue = byId.get(e.id);
    if (!queue?.length || queue[0] !== e) continue;
    queue.shift();
    const item = newItem(doc, e, fields);
    if (spaced && kept.length > 0) item.spaceBefore = true;
    kept.push(item);
    changed = true;
  }

  seq.items = kept;
  return changed;
}

/**
 * Serializes a document. The seed files write single-line flow sequences
 * without inner padding (`[a, b]`) but flow maps with it (`{ x: 1, y: 2 }`);
 * `yaml` only has one global padding switch, so unpad `targets:` lines here.
 */
export function stringifyDoc(doc: Document): string {
  return doc
    .toString(STRINGIFY_OPTIONS)
    .replace(/^(\s*(?:- )?targets: )\[ ([^\n]*?) \]([ \t]*(?:#[^\n]*)?)$/gm, "$1[$2]$3");
}
