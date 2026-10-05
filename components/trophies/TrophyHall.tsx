"use client";

import { useMemo } from "react";
import type { World } from "@/lib/types";
import { monsterMini } from "@/lib/map/minis";
import { Dialog } from "@/components/ui/Dialog";
import { Portrait } from "@/components/ui/Portrait";
import { dayLabel, trophyHall, type Plaque } from "./trophies";

/**
 * The trophy hall: a full-screen glass overlay with every slain monster as a
 * plaque, grouped by month of `slain`, newest first. Esc or the close button
 * returns to the table.
 */
export function TrophyHall({ world, open, onClose }: { world: World; open: boolean; onClose: () => void }) {
  const groups = useMemo(() => trophyHall(world), [world]);
  return (
    <Dialog title="Trophy hall" open={open} onClose={onClose} className="h-full max-w-7xl!">
      {groups.length === 0 ? (
        <p className="text-sm text-hud-muted">
          No trophies yet. Slay a monster with Slay on its card, or drop it on the trophy shelf.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.month} aria-label={g.label} className="mt-6 first:mt-0">
            <h3 className="font-display mb-3 border-b border-hud-line pb-1.5 text-sm tracking-[0.12em] text-hud-gold/80 uppercase">
              {g.label}
            </h3>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
              {g.plaques.map((p) => (
                <li key={p.monster.id}>
                  <PlaqueView plaque={p} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Dialog>
  );
}

function PlaqueView({ plaque }: { plaque: Plaque }) {
  const { monster, note, by } = plaque;
  return (
    <article className="flex h-full gap-3 rounded-hud border border-hud-line bg-linear-to-b from-[#3a2a17]/50 to-black/20 p-3">
      <span className="block h-fit shrink-0 rounded-full ring-1 ring-[#a7804a]/70">
        <Portrait mini={monsterMini(monster.size)} size={56} bronze />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="font-display text-sm leading-tight break-words text-hud-gold">{monster.name}</h4>
        <p className="mt-0.5 text-xs text-hud-muted">Slain {dayLabel(monster.slain)}</p>
        {note && <p className="mt-1.5 truncate text-sm" title={note}>{note}</p>}
        {by.length > 0 && <p className="mt-1 text-xs text-hud-muted">by {by.join(", ")}</p>}
      </div>
    </article>
  );
}
