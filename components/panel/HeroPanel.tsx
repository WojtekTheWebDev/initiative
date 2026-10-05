"use client";

import type { Hero, Monster, World } from "@/lib/types";
import { heroMini, monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { deleteHero } from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import { Button, ConfirmButton } from "@/components/ui/Button";
import { ErrorNote, SectionLabel, useAction } from "./ui";

export function HeroPanel({
  world,
  hero,
  onEdit,
  onGone,
  onFlyTo,
}: {
  world: World;
  hero: Hero;
  onEdit: () => void;
  onGone: () => void;
  onFlyTo: (monster: Monster) => void;
}) {
  const { pending, error, run, clearError } = useAction();
  const targets = hero.targets
    .map((id) => world.monsters.find((m) => m.id === id))
    .filter((m): m is Monster => Boolean(m));

  return (
    <div>
      <div className="flex items-center gap-3 pr-8">
        <Portrait mini={heroMini(hero.mini)} size={56} />
        <div className="min-w-0">
          <h2 className="font-display text-lg break-words text-hud-gold">{hero.name}</h2>
          <p className="text-sm opacity-70">
            {hero.class} · {heroMini(hero.mini).name}
          </p>
        </div>
      </div>

      <SectionLabel>Targets</SectionLabel>
      {targets.length === 0 ? (
        <p className="text-sm opacity-70">Idle. Drag onto a monster to assign.</p>
      ) : (
        <ol className="space-y-0.5 text-sm">
          {targets.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                title="Fly to this monster"
                className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-white/10 ${i > 0 ? "opacity-60" : ""}`}
                onClick={() => onFlyTo(m)}
              >
                <Portrait mini={monsterMini(m.size)} size={24} />
                <span className="flex-1 truncate">{m.name}</span>
                <span className="text-xs opacity-60">{i === 0 ? "main" : "secondary"}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onEdit} disabled={pending}>
          Edit
        </Button>
        <ConfirmButton
          disabled={pending}
          confirmLabel="Delete for good? Can't be undone"
          onConfirm={() =>
            run(async () => {
              await unwrap(deleteHero(hero.id));
              onGone();
            })
          }
        >
          Delete
        </ConfirmButton>
      </div>
      <ErrorNote error={error} onDismiss={clearError} />
    </div>
  );
}
