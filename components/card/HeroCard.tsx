"use client";

import type { Hero, Monster, World } from "@/lib/types";
import { heroMini, monsterMini } from "@/lib/map/minis";
import { deleteHero, roleOf } from "@/lib/domain";
import { Portrait } from "@/components/ui/Portrait";
import { Icon } from "@/components/ui/icons";
import { CardHeader, CardLabel, CardMenu, EditButton, useCardAction } from "./parts";

/**
 * The figure card of a hero: portrait, name, class and mini, targets in order
 * with the main one crowned (a click flies to that monster), then Edit and the
 * ⋯ menu with Delete.
 */
export function HeroCard({
  world,
  hero,
  onFlyTo,
  onClose,
  onEdit,
}: {
  world: World;
  hero: Hero;
  onFlyTo: (monster: Monster) => void;
  /** Closes the card (the hero is leaving the table). */
  onClose: () => void;
  /** Opens the edit dialog; without it there is no Edit button. */
  onEdit?: () => void;
}) {
  const act = useCardAction();
  const mini = heroMini(hero.mini);
  const targets = hero.targets
    .map((id) => world.monsters.find((m) => m.id === id))
    .filter((m): m is Monster => Boolean(m));

  return (
    <>
      <div className="absolute top-2 right-2">
        <CardMenu name={hero.name} onDelete={() => act("delete the hero", (w) => deleteHero(w, hero.id), onClose)} />
      </div>
      <CardHeader
        portrait={<Portrait mini={mini} size={52} />}
        name={hero.name}
        facts={
          <>
            {roleOf(hero)} · {mini.name}
          </>
        }
      />

      <CardLabel>Targets</CardLabel>
      {targets.length === 0 ? (
        <p className="text-sm text-hud-muted">Idle. Drag onto a monster to assign.</p>
      ) : (
        <ol className="-mx-1.5 space-y-0.5 text-sm">
          {targets.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                aria-label={`Fly to ${m.name} (${i === 0 ? "main" : "secondary"} target)`}
                title="Fly to this monster"
                onClick={() => onFlyTo(m)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-hud-gold"
              >
                <Portrait mini={monsterMini(m)} size={26} className={i === 0 ? "" : "opacity-60"} />
                <span className={`min-w-0 flex-1 truncate ${i === 0 ? "" : "text-hud-muted"}`}>{m.name}</span>
                {i === 0 && <Icon.crown className="size-4 shrink-0 text-hud-gold" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ol>
      )}

      {onEdit && (
        <div className="mt-3.5 flex gap-2">
          <EditButton onEdit={onEdit} />
        </div>
      )}
    </>
  );
}
