"use server";

import { refresh } from "next/cache";
import * as domain from "@/lib/domain";
import { updateWorld } from "@/lib/store";
import type { ActionResult } from "@/lib/action-result";
import type { Pos, Size } from "@/lib/types";

// Every action re-reads the YAML, applies a pure rule from lib/domain, writes
// through the store (which keeps comments), then refreshes the current route.
// Inputs come from the client, so they are validated here before use.

const SIZES: readonly Size[] = ["S", "M", "L", "XL"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function checkName(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must not be empty`);
  }
  return value.trim();
}

function checkSize(value: unknown): Size {
  if (!SIZES.includes(value as Size)) {
    throw new Error(`Size must be one of ${SIZES.join(", ")}, got ${JSON.stringify(value)}`);
  }
  return value as Size;
}

function checkNotes(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Notes must be text");
  return value;
}

/** A hero's mini pick: any text, or "" for none (the neutral adventurer). */
function checkMini(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Mini must be text");
  return value;
}

function checkPos(value: unknown): Pos {
  if (!isObject(value) || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new Error("Position must be { x, y } with finite numbers");
  }
  return { x: value.x as number, y: value.y as number };
}

function checkPatch(value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new Error("Patch must be an object");
  return value;
}

/**
 * Runs the validation and the write, then refreshes the route. Errors from those
 * become `{ ok: false, error }`, because Next.js hides thrown messages in
 * production. `refresh()` stays outside the try, so its errors are not swallowed.
 * Nothing inside `fn` uses Next APIs that throw on purpose (redirect, notFound),
 * so there is nothing to pass to `unstable_rethrow`.
 */
async function act<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  let value: T;
  try {
    value = await fn();
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Could not save the change" };
  }
  refresh();
  return { ok: true, value };
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function moveMonster(id: string, pos: Pos): Promise<ActionResult> {
  return act(async () => {
    const monsterId = checkId(id, "Monster id");
    const p = checkPos(pos);
    await updateWorld((w) => domain.moveMonster(w, monsterId, p));
  });
}

export async function dropHero(
  heroId: string,
  drop: { monsterId: string; shift: boolean } | { pos: Pos },
): Promise<ActionResult> {
  return act(async () => {
    const hid = checkId(heroId, "Hero id");
    if (!isObject(drop)) throw new Error("Drop must be { monsterId, shift } or { pos }");

    if ("monsterId" in drop) {
      const mid = checkId(drop.monsterId, "Monster id");
      if (typeof drop.shift !== "boolean") throw new Error("Drop shift must be a boolean");
      const shift = drop.shift;
      await updateWorld((w) => {
        if (shift) return domain.addGhost(w, hid, mid);
        // A plain drop back on the current main target changes nothing (keeps secondary targets).
        const hero = w.heroes.find((h) => h.id === hid);
        if (hero && hero.targets[0] === mid) return w;
        return domain.assign(w, hid, mid);
      });
      return;
    }

    if ("pos" in drop) {
      const p = checkPos(drop.pos);
      await updateWorld((w) => domain.setIdle(w, hid, p));
      return;
    }

    throw new Error("Drop must be { monsterId, shift } or { pos }");
  });
}

export async function makeMain(heroId: string, monsterId: string): Promise<ActionResult> {
  return act(async () => {
    const hid = checkId(heroId, "Hero id");
    const mid = checkId(monsterId, "Monster id");
    await updateWorld((w) => domain.makeMain(w, hid, mid));
  });
}

export async function removeTarget(heroId: string, monsterId: string): Promise<ActionResult> {
  return act(async () => {
    const hid = checkId(heroId, "Hero id");
    const mid = checkId(monsterId, "Monster id");
    await updateWorld((w) => domain.removeTarget(w, hid, mid));
  });
}

/** Returns the new monster's id. */
export async function createMonster(input: {
  name: string;
  size: Size;
  notes?: string;
  pos: Pos;
}): Promise<ActionResult<string>> {
  return act(async () => {
    if (!isObject(input)) throw new Error("Monster input must be an object");
    const clean = {
      name: checkName(input.name, "Monster name"),
      size: checkSize(input.size),
      notes: checkNotes(input.notes),
      pos: checkPos(input.pos),
    };
    let id = "";
    await updateWorld((w) => {
      const r = domain.createMonster(w, clean);
      id = r.id;
      return r.world;
    });
    return id;
  });
}

export async function updateMonster(
  id: string,
  patch: { name?: string; size?: Size; notes?: string },
): Promise<ActionResult> {
  return act(async () => {
    const monsterId = checkId(id, "Monster id");
    const p = checkPatch(patch);
    const clean: domain.MonsterPatch = {};
    if (p.name !== undefined) clean.name = checkName(p.name, "Monster name");
    if (p.size !== undefined) clean.size = checkSize(p.size);
    if ("notes" in p) clean.notes = checkNotes(p.notes);
    await updateWorld((w) => domain.updateMonster(w, monsterId, clean));
  });
}

export async function slayMonster(id: string): Promise<ActionResult> {
  return act(async () => {
    const monsterId = checkId(id, "Monster id");
    const today = localToday();
    await updateWorld((w) => domain.slay(w, monsterId, today));
  });
}

export async function deleteMonster(id: string): Promise<ActionResult> {
  return act(async () => {
    const monsterId = checkId(id, "Monster id");
    await updateWorld((w) => domain.deleteMonster(w, monsterId));
  });
}

/** Returns the new hero's id. */
export async function createHero(input: {
  name: string;
  class: string;
  mini?: string;
  pos: Pos;
}): Promise<ActionResult<string>> {
  return act(async () => {
    if (!isObject(input)) throw new Error("Hero input must be an object");
    const clean = {
      name: checkName(input.name, "Hero name"),
      class: checkName(input.class, "Hero class"),
      mini: checkMini(input.mini),
      pos: checkPos(input.pos),
    };
    let id = "";
    await updateWorld((w) => {
      const r = domain.createHero(w, clean);
      id = r.id;
      return r.world;
    });
    return id;
  });
}

export async function updateHero(
  id: string,
  patch: { name?: string; class?: string; mini?: string },
): Promise<ActionResult> {
  return act(async () => {
    const heroId = checkId(id, "Hero id");
    const p = checkPatch(patch);
    const clean: domain.HeroPatch = {};
    if (p.name !== undefined) clean.name = checkName(p.name, "Hero name");
    if (p.class !== undefined) clean.class = checkName(p.class, "Hero class");
    if ("mini" in p) clean.mini = checkMini(p.mini) ?? "";
    await updateWorld((w) => domain.updateHero(w, heroId, clean));
  });
}

export async function deleteHero(id: string): Promise<ActionResult> {
  return act(async () => {
    const heroId = checkId(id, "Hero id");
    await updateWorld((w) => domain.deleteHero(w, heroId));
  });
}
