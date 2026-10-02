"use client";

import type { Hero, Monster, World } from "@/lib/types";
import { creatureOf, fightersOf, territoryOf } from "@/lib/domain";
import { heroGlyph, monsterGlyph } from "@/lib/map/glyphs";
import { deleteMonster, slayMonster } from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import { Button, ConfirmButton, ErrorNote, SectionLabel, useAction } from "./ui";

const TERRITORY_LABEL = { team: "Team battlefield", keep: "Your keep" } as const;

/** Read-only facts about a monster, shared with the trophy view. */
export function MonsterFacts({ monster }: { monster: Monster }) {
  const territory = territoryOf(monster.pos);
  return (
    <>
      <div className="flex items-center gap-3 pr-8">
        <span className="text-4xl leading-none" aria-hidden="true">
          {monsterGlyph(monster.size)}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold break-words">{monster.name}</h2>
          <p className="text-sm opacity-70">
            {monster.size} · {creatureOf(monster.size)}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="opacity-60">Territory</dt>
        <dd>
          <span
            className={`mr-1.5 inline-block size-2 rounded-full ${territory === "team" ? "bg-[#b4432c]" : "bg-[#2f5fb3]"}`}
          />
          {TERRITORY_LABEL[territory]}
        </dd>
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
        <p className="text-sm text-red-600 dark:text-red-400">Nobody is fighting this monster.</p>
      ) : (
        <ul className="space-y-0.5 text-sm">
          {main.map((h) => (
            <FighterRow key={h.id} hero={h} onClick={() => onSelectHero(h.id)} />
          ))}
          {ghosts.map((h) => (
            <FighterRow key={h.id} hero={h} ghost onClick={() => onSelectHero(h.id)} />
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onEdit} disabled={pending}>
          Edit
        </Button>
        <Button
          tone="primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await unwrap(slayMonster(monster.id));
              onGone();
            })
          }
        >
          ⚔️ Slay
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

function FighterRow({ hero, ghost, onClick }: { hero: Hero; ghost?: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-foreground/10 ${ghost ? "opacity-60" : ""}`}
        onClick={onClick}
      >
        <span aria-hidden="true">{heroGlyph(hero.class)}</span>
        <span className="flex-1 truncate">{hero.name}</span>
        <span className="text-xs opacity-60">{ghost ? "ghost" : "main"}</span>
      </button>
    </li>
  );
}
