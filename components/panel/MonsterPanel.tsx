"use client";

import type { Hero, Monster, World } from "@/lib/types";
import { creatureOf, fightersOf } from "@/lib/domain";
import { heroMini, monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { deleteMonster, slayMonster } from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import { Button, ConfirmButton } from "@/components/ui/Button";
import { ErrorNote, SectionLabel, useAction } from "./ui";

/** Read-only facts about a monster, shared with the trophy view. */
export function MonsterFacts({ monster }: { monster: Monster }) {
  return (
    <>
      <div className="flex items-center gap-3 pr-8">
        <Portrait mini={monsterMini(monster.size)} size={56} />
        <div className="min-w-0">
          <h2 className="font-display text-lg break-words text-hud-gold">{monster.name}</h2>
          <p className="text-sm opacity-70">
            {monster.size} · {creatureOf(monster.size)}
          </p>
        </div>
      </div>
      {(monster.externalKey || monster.slain) && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {monster.externalKey && (
            <>
              <dt className="opacity-60">Key</dt>
              <dd className="font-mono">{monster.externalKey}</dd>
            </>
          )}
          {monster.slain && (
            <>
              <dt className="opacity-60">Slain</dt>
              <dd>{monster.slain}</dd>
            </>
          )}
        </dl>
      )}
      {monster.notes && (
        <>
          <SectionLabel>Notes</SectionLabel>
          <p className="text-sm whitespace-pre-wrap break-words">{monster.notes}</p>
        </>
      )}
    </>
  );
}

export function MonsterPanel({
  world,
  monster,
  onEdit,
  onGone,
  onSelectHero,
}: {
  world: World;
  monster: Monster;
  onEdit: () => void;
  /** After slay or delete: the monster is no longer on the map. */
  onGone: () => void;
  onSelectHero: (id: string) => void;
}) {
  const { pending, error, run, clearError } = useAction();
  const { main, ghosts } = fightersOf(world, monster.id);

  return (
    <div>
      <MonsterFacts monster={monster} />

      <SectionLabel>Fighters</SectionLabel>
      {main.length + ghosts.length === 0 ? (
        <p className="text-sm text-[#ff9a9d]">Nobody is fighting this monster.</p>
      ) : (
        <ul className="space-y-0.5 text-sm">
          {main.map((h) => (
            <FighterRow key={h.id} hero={h} onClick={() => onSelectHero(h.id)} />
          ))}
          {ghosts.map((h) => (
            <FighterRow key={h.id} hero={h} secondary onClick={() => onSelectHero(h.id)} />
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onEdit} disabled={pending}>
          Edit
        </Button>
        <Button
          tone="primary"
          icon="swords"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await unwrap(slayMonster(monster.id));
              onGone();
            })
          }
        >
          Slay
        </Button>
        <ConfirmButton
          disabled={pending}
          confirmLabel="Delete for good? Can't be undone"
          onConfirm={() =>
            run(async () => {
              await unwrap(deleteMonster(monster.id));
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

function FighterRow({ hero, secondary, onClick }: { hero: Hero; secondary?: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-white/10 ${secondary ? "opacity-60" : ""}`}
        onClick={onClick}
      >
        <Portrait mini={heroMini(hero.mini)} size={24} />
        <span className="flex-1 truncate">{hero.name}</span>
        <span className="text-xs opacity-60">{secondary ? "secondary" : "main"}</span>
      </button>
    </li>
  );
}
