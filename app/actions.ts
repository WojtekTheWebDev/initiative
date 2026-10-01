"use server";

import { refresh } from "next/cache";
import * as domain from "@/lib/domain";
import { updateWorld } from "@/lib/store";
import type { Pos, Size, World } from "@/lib/types";

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

async function apply(fn: (w: World) => World): Promise<void> {
  await updateWorld(fn);
  refresh();
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function moveMonster(id: string, pos: Pos): Promise<void> {
  const monsterId = checkId(id, "Monster id");
  const p = checkPos(pos);
  await apply((w) => domain.moveMonster(w, monsterId, p));
}

export async function dropHero(
  heroId: string,
  drop: { monsterId: string; shift: boolean } | { pos: Pos },
): Promise<void> {
  const hid = checkId(heroId, "Hero id");
  if (!isObject(drop)) throw new Error("Drop must be { monsterId, shift } or { pos }");

  if ("monsterId" in drop) {
    const mid = checkId(drop.monsterId, "Monster id");
    if (typeof drop.shift !== "boolean") throw new Error("Drop shift must be a boolean");
    const shift = drop.shift;
    await apply((w) => {
      if (shift) return domain.addGhost(w, hid, mid);
      // A plain drop back on the current main target changes nothing (keeps ghosts).
      const hero = w.heroes.find((h) => h.id === hid);
      if (hero && hero.targets[0] === mid) return w;
      return domain.assign(w, hid, mid);
    });
    return;
  }

  if ("pos" in drop) {
    const p = checkPos(drop.pos);
    await apply((w) => domain.setIdle(w, hid, p));
    return;
  }

  throw new Error("Drop must be { monsterId, shift } or { pos }");
}

export async function makeMain(heroId: string, monsterId: string): Promise<void> {
  const hid = checkId(heroId, "Hero id");
  const mid = checkId(monsterId, "Monster id");
  await apply((w) => domain.makeMain(w, hid, mid));
}

export async function removeTarget(heroId: string, monsterId: string): Promise<void> {
  const hid = checkId(heroId, "Hero id");
  const mid = checkId(monsterId, "Monster id");
  await apply((w) => domain.removeTarget(w, hid, mid));
}

export async function createMonster(input: {
  name: string;
  size: Size;
  notes?: string;
  pos: Pos;
}): Promise<string> {
  if (!isObject(input)) throw new Error("Monster input must be an object");
  const clean = {
    name: checkName(input.name, "Monster name"),
    size: checkSize(input.size),
    notes: checkNotes(input.notes),
    pos: checkPos(input.pos),
  };
  let id = "";
  await apply((w) => {
    const r = domain.createMonster(w, clean);
    id = r.id;
    return r.world;
  });
  return id;
}

export async function updateMonster(
  id: string,
  patch: { name?: string; size?: Size; notes?: string },
): Promise<void> {
  const monsterId = checkId(id, "Monster id");
  const p = checkPatch(patch);
  const clean: domain.MonsterPatch = {};
  if (p.name !== undefined) clean.name = checkName(p.name, "Monster name");
  if (p.size !== undefined) clean.size = checkSize(p.size);
  if ("notes" in p) clean.notes = checkNotes(p.notes);
  await apply((w) => domain.updateMonster(w, monsterId, clean));
}

export async function slayMonster(id: string): Promise<void> {
  const monsterId = checkId(id, "Monster id");
  const today = localToday();
  await apply((w) => domain.slay(w, monsterId, today));
}

export async function deleteMonster(id: string): Promise<void> {
  const monsterId = checkId(id, "Monster id");
  await apply((w) => domain.deleteMonster(w, monsterId));
}

export async function createHero(input: { name: string; class: string; pos: Pos }): Promise<string> {
  if (!isObject(input)) throw new Error("Hero input must be an object");
  const clean = {
    name: checkName(input.name, "Hero name"),
    class: checkName(input.class, "Hero class"),
    pos: checkPos(input.pos),
  };
  let id = "";
  await apply((w) => {
    const r = domain.createHero(w, clean);
    id = r.id;
    return r.world;
  });
  return id;
}

export async function updateHero(id: string, patch: { name?: string; class?: string }): Promise<void> {
  const heroId = checkId(id, "Hero id");
  const p = checkPatch(patch);
  const clean: domain.HeroPatch = {};
  if (p.name !== undefined) clean.name = checkName(p.name, "Hero name");
  if (p.class !== undefined) clean.class = checkName(p.class, "Hero class");
  await apply((w) => domain.updateHero(w, heroId, clean));
}

export async function deleteHero(id: string): Promise<void> {
  const heroId = checkId(id, "Hero id");
  await apply((w) => domain.deleteHero(w, heroId));
}
