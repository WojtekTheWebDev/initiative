"use client";

// TEMPORARY (T4): manual test buttons for the Server Actions. Delete with app/_dev/.

import { useState, useTransition } from "react";
import {
  createMonster,
  deleteMonster,
  dropHero,
  moveMonster,
  slayMonster,
} from "@/app/actions";
import type { World } from "@/lib/types";

export function ActionsTestPanel({ world }: { world: World }) {
  const [pending, startTransition] = useTransition();
  const [log, setLog] = useState("");
  const living = world.monsters.filter((m) => !m.slain);

  const run = (label: string, fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        const result = await fn();
        setLog(`${label}: ok${result ? ` (${String(result)})` : ""}`);
      } catch (e) {
        setLog(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  const first = living[0];
  const btn = "rounded border px-2 py-1 text-xs disabled:opacity-50";

  return (
    <section className="flex max-w-xl flex-col gap-2 rounded border p-3 text-xs">
      <div className="font-semibold">Dev: actions test panel</div>
      <div className="flex flex-wrap gap-2">
        <button
          className={btn}
          disabled={pending || !first}
          onClick={() => run("move", () => moveMonster(first.id, { x: first.pos.x + 25, y: first.pos.y }))}
        >
          Move {first?.id} +25x
        </button>
        <button
          className={btn}
          disabled={pending}
          onClick={() => run("ghost", () => dropHero("bartek", { monsterId: "flaky-ci", shift: true }))}
        >
          Shift-add bartek → flaky-ci
        </button>
        <button
          className={btn}
          disabled={pending}
          onClick={() => run("slay", () => slayMonster("payments-incident"))}
        >
          Slay payments-incident
        </button>
        <button
          className={btn}
          disabled={pending}
          onClick={() =>
            run("create", () => createMonster({ name: "Test Goblin", size: "S", pos: { x: 100, y: 100 } }))
          }
        >
          Create Test Goblin
        </button>
        <button
          className={btn}
          disabled={pending}
          onClick={() => run("delete", () => deleteMonster("test-goblin"))}
        >
          Delete test-goblin
        </button>
        <button
          className={btn}
          disabled={pending}
          onClick={() => run("invalid", () => createMonster({ name: "  ", size: "S", pos: { x: 0, y: 0 } }))}
        >
          Invalid create
        </button>
      </div>
      <div data-testid="log">{pending ? "…" : log}</div>
      <ul data-testid="monsters">
        {living.map((m) => (
          <li key={m.id}>
            {m.id} “{m.name}” ({m.pos.x}, {m.pos.y})
          </li>
        ))}
      </ul>
      <ul data-testid="heroes">
        {world.heroes.map((h) => (
          <li key={h.id}>
            {h.id}: [{h.targets.join(", ")}]
          </li>
        ))}
      </ul>
    </section>
  );
}
