"use client";

import { useMemo, type MouseEvent } from "react";
import type { World } from "@/lib/types";
import { monsterMini } from "@/lib/map/minis";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Portrait } from "@/components/ui/Portrait";
import { dayLabel, trophyHall, type Plaque } from "./trophies";

/**
 * The trophy hall: a full-screen glass overlay with every slain monster as a
 * plaque, grouped by month of `slain`, newest first. Revive on a plaque brings
 * the monster back to the table. Esc or the close button returns to the table.
 */
export function TrophyHall({
  world,
  open,
  onClose,
  onRevive,
}: {
  world: World;
  open: boolean;
  onClose: () => void;
  onRevive: (monsterId: string) => void;
}) {
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
                  <PlaqueView
                    plaque={p}
                    onRevive={(e) => {
                      keepFocusInHall(e.currentTarget);
                      onRevive(p.monster.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Dialog>
  );
}

/**
 * The plaque whose Revive was pressed leaves the hall, so focus moves to the
 * next plaque's Revive (or the previous one, or the close button) and Esc and
 * Tab keep working inside the dialog.
 */
function keepFocusInHall(button: HTMLButtonElement) {
  const hall = button.closest<HTMLElement>('[aria-modal="true"]');
  if (!hall) return;
  const undos = [...hall.querySelectorAll<HTMLButtonElement>("button[data-revive]")];
  const i = undos.indexOf(button);
  const next = undos[i + 1] ?? undos[i - 1] ?? hall.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
  next?.focus();
}

function PlaqueView({
  plaque,
  onRevive,
}: {
  plaque: Plaque;
  onRevive: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
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
        <Button icon="undo" className="mt-2.5" data-revive aria-label={`Revive ${monster.name}`} onClick={onRevive}>
          Revive
        </Button>
      </div>
    </article>
  );
}
