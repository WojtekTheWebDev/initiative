import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Document, parseDocument } from "yaml";
import { validateWorld } from "@/lib/domain/validate";
import type { World } from "@/lib/types";
import {
  HERO_FIELDS,
  MONSTER_FIELDS,
  heroesFromDoc,
  monstersFromDoc,
  stringifyDoc,
  syncDoc,
} from "./sync";

/**
 * Core of the YAML store. Free of `server-only` so Vitest can import it;
 * app code should import from `@/lib/store` instead.
 */

export const FILES = { heroes: "heroes.yaml", monsters: "monsters.yaml" } as const;

export const defaultDataDir = () => path.join(process.cwd(), "data");
export const defaultExampleDir = () => path.join(process.cwd(), "data.example");

const tmpPath = (file: string) => `${file}.${randomUUID()}.tmp`;

const isErrno = (e: unknown, code: string) =>
  !!e && typeof e === "object" && (e as NodeJS.ErrnoException).code === code;

/** Writes via a temp file and `rename`, so readers never see a half-written file. */
async function writeAtomic(file: string, content: string): Promise<void> {
  const tmp = tmpPath(file);
  try {
    await writeFile(tmp, content, "utf8");
    await rename(tmp, file);
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw e;
  }
}

/**
 * Copies each missing file from `exampleDir`. Never overwrites: the file is
 * written to a temp path and hard-linked into place, which fails if it exists.
 */
export async function seed(dir = defaultDataDir(), exampleDir = defaultExampleDir()): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const name of [FILES.heroes, FILES.monsters]) {
    const file = path.join(dir, name);
    try {
      await readFile(file);
      continue;
    } catch (e) {
      if (!isErrno(e, "ENOENT")) throw e;
    }
    const content = await readFile(path.join(exampleDir, name), "utf8");
    const tmp = tmpPath(file);
    await writeFile(tmp, content, "utf8");
    try {
      await link(tmp, file);
    } catch (e) {
      if (!isErrno(e, "EEXIST")) throw e;
    } finally {
      await unlink(tmp).catch(() => {});
    }
  }
}

type Loaded = {
  world: World;
  docs: { heroes: Document; monsters: Document };
  texts: { heroes: string; monsters: string };
};

async function parseFile(file: string): Promise<{ doc: Document; text: string }> {
  const text = await readFile(file, "utf8");
  // Default YAML 1.2 core schema: `2026-09-28` stays a string (no timestamp tag).
  const doc = parseDocument(text);
  if (doc.errors.length > 0) {
    throw new Error(`Cannot parse ${file}: ${doc.errors.map((e) => e.message).join("; ")}`);
  }
  return { doc, text };
}

async function load(dir: string, exampleDir: string): Promise<Loaded> {
  await seed(dir, exampleDir);
  const [heroes, monsters] = await Promise.all([
    parseFile(path.join(dir, FILES.heroes)),
    parseFile(path.join(dir, FILES.monsters)),
  ]);
  const problems: string[] = [];
  const world: World = {
    monsters: monstersFromDoc(monsters.doc, problems),
    heroes: heroesFromDoc(heroes.doc, problems),
  };

  // Files are edited by hand, so problems are logged, never thrown.
  problems.push(...validateWorld(world));
  if (problems.length > 0) {
    console.warn(`[store] ${dir}: ${problems.length} problem(s)\n  - ${problems.join("\n  - ")}`);
  }

  return {
    world,
    docs: { heroes: heroes.doc, monsters: monsters.doc },
    texts: { heroes: heroes.text, monsters: monsters.text },
  };
}

/** Reads the world from `dir`, seeding missing files from `exampleDir` first. */
export async function readWorld(dir = defaultDataDir(), exampleDir = defaultExampleDir()): Promise<World> {
  return (await load(dir, exampleDir)).world;
}

// One chain per process, kept on globalThis so separate module instances
// (e.g. dev-server bundles) still share it.
const LOCK = Symbol.for("initiative.store.lock");
type LockHolder = { [LOCK]?: Promise<unknown> };

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const g = globalThis as LockHolder;
  const run = (g[LOCK] ?? Promise.resolve()).then(fn, fn);
  g[LOCK] = run.catch(() => {});
  return run;
}

/**
 * Re-reads both files, applies `fn`, and syncs the result back onto the parsed
 * Documents so comments survive. Only files whose content changed are written,
 * heroes before monsters. Calls are serialized within the process.
 */
export function updateWorld(
  fn: (w: World) => World,
  dir = defaultDataDir(),
  exampleDir = defaultExampleDir(),
): Promise<World> {
  return withLock(async () => {
    const { world, docs, texts } = await load(dir, exampleDir);
    const next = fn(world);

    const plan = [
      { name: FILES.heroes, doc: docs.heroes, text: texts.heroes, items: next.heroes, fields: HERO_FIELDS },
      { name: FILES.monsters, doc: docs.monsters, text: texts.monsters, items: next.monsters, fields: MONSTER_FIELDS },
    ];
    for (const { name, doc, text, items, fields } of plan) {
      if (!syncDoc(doc, items, fields)) continue;
      const out = stringifyDoc(doc);
      if (out !== text) await writeAtomic(path.join(dir, name), out);
    }
    return next;
  });
}
