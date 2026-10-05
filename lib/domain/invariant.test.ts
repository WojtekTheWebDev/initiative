import { describe, it } from "vitest";
import type { World } from "@/lib/types";
import * as domain from "./index";
import { expectValid, makeWorld } from "./test-fixtures";

// Every mutator, applied to every sensible argument, must keep the world valid.
const ops: [string, (w: World) => World][] = [];
const heroes = ["ana", "bob", "cid"];
const living = ["m1", "m2", "m3"];
for (const h of heroes) {
  for (const m of living) {
    ops.push([`assign ${h} ${m}`, (w) => domain.assign(w, h, m)]);
    ops.push([`addSecondary ${h} ${m}`, (w) => domain.addSecondary(w, h, m)]);
    ops.push([`removeTarget ${h} ${m}`, (w) => domain.removeTarget(w, h, m)]);
  }
  ops.push([`setIdle ${h}`, (w) => domain.setIdle(w, h, { x: 1, y: 1 })]);
  ops.push([`deleteHero ${h}`, (w) => domain.deleteHero(w, h)]);
  ops.push([`updateHero ${h}`, (w) => domain.updateHero(w, h, { name: "z" })]);
}
for (const m of [...living, "m4"]) {
  ops.push([`slay ${m}`, (w) => domain.slay(w, m, "2026-10-01")]);
  ops.push([`deleteMonster ${m}`, (w) => domain.deleteMonster(w, m)]);
  ops.push([`moveMonster ${m}`, (w) => domain.moveMonster(w, m, { x: -5, y: 5 })]);
  ops.push([`updateMonster ${m}`, (w) => domain.updateMonster(w, m, { size: "S", notes: "" })]);
}
ops.push(["makeMain ana m2", (w) => domain.makeMain(w, "ana", "m2")]);
ops.push(["createMonster", (w) => domain.createMonster(w, { name: "New", size: "M", pos: { x: 0, y: 0 } }).world]);
ops.push(["createHero", (w) => domain.createHero(w, { name: "New", class: "x", pos: { x: 0, y: 0 } }).world]);

describe("invariant holds after every mutator", () => {
  it.each(ops)("%s", (_name, op) => {
    expectValid(op(makeWorld()));
  });

  it("holds over a long chain of mutations", () => {
    let w = makeWorld();
    for (const [, op] of ops) {
      try {
        w = op(w);
      } catch {
        // some ops are invalid mid-chain (e.g. deleted hero); skip them
      }
      expectValid(w);
    }
  });
});
