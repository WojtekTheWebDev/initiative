"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Hero, Monster, World } from "@/lib/types";
import { creatureOf, fightersOf } from "@/lib/domain";
import { heroMini, monsterMini } from "@/lib/map/minis";
import { deleteMonster } from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import { Portrait } from "@/components/ui/Portrait";
import { Button } from "@/components/ui/Button";
import { CardHeader, CardLabel, CardMenu, EditButton, useCardAction } from "./parts";

/** Fighter portraits shown before the rest fold into "+N". */
const MAX_FIGHTERS = 8;

/**
 * The figure card of a living monster: portrait, name, size and creature, key,
 * notes, fighters (a click selects that hero), then Edit, Slay and the ⋯ menu
 * with Delete.
 */
export function MonsterCard({
  world,
  monster,
  onSelectHero,
  onClose,
  onSlay,
  onEdit,
}: {
  world: World;
  monster: Monster;
  onSelectHero: (id: string) => void;
  /** Closes the card (the monster is leaving the table). */
  onClose: () => void;
  /** Slays it, with the slay toast and its Undo. */
  onSlay: () => void;
  /** Opens the edit dialog; without it there is no Edit button. */
  onEdit?: () => void;
}) {
  const act = useCardAction();
  const { main, secondary } = fightersOf(world, monster.id);
  const fighters = [...main.map((hero) => ({ hero, main: true })), ...secondary.map((hero) => ({ hero, main: false }))];

  return (
    <>
      <div className="absolute top-2 right-2">
        <CardMenu
          name={monster.name}
          onDelete={() => act("delete the monster", () => unwrap(deleteMonster(monster.id)), onClose)}
        />
      </div>
      <CardHeader
        portrait={<Portrait mini={monsterMini(monster.size)} size={52} ring={fighters.length ? undefined : "red"} />}
        name={monster.name}
        facts={
          <>
            <span>
              {monster.size} · {creatureOf(monster.size)}
            </span>
            {monster.externalKey && <span className="font-mono whitespace-nowrap text-hud-fg">{monster.externalKey}</span>}
          </>
        }
      />
      {monster.notes && <Notes notes={monster.notes} />}

      <CardLabel>Fighters</CardLabel>
      {fighters.length === 0 ? (
        <p className="text-sm text-[#ff9a9d]">Nobody is fighting it.</p>
      ) : (
        <ul className="flex flex-wrap items-center pl-1.5">
          {fighters.slice(0, MAX_FIGHTERS).map(({ hero, main }) => (
            <li key={hero.id} className="-ml-1.5">
              <Fighter hero={hero} main={main} onClick={() => onSelectHero(hero.id)} />
            </li>
          ))}
          {fighters.length > MAX_FIGHTERS && (
            <li className="ml-1.5 text-sm text-hud-muted">+{fighters.length - MAX_FIGHTERS}</li>
          )}
        </ul>
      )}

      <div className="mt-3.5 flex gap-2">
        <EditButton onEdit={onEdit} />
        <Button
          tone="primary"
          icon="swords"
          className="h-8"
          onClick={() => {
            onClose();
            onSlay();
          }}
        >
          Slay
        </Button>
      </div>
    </>
  );
}

function Fighter({ hero, main, onClick }: { hero: Hero; main: boolean; onClick: () => void }) {
  const role = main ? "main target" : "secondary target";
  return (
    <button
      type="button"
      aria-label={`Select hero ${hero.name} (${role})`}
      title={`${hero.name} (${role})`}
      className="relative block cursor-pointer rounded-full ring-2 ring-[#16181d] hover:z-10 hover:ring-hud-gold focus-visible:z-10 focus-visible:ring-hud-gold focus-visible:outline-none"
      onClick={onClick}
    >
      <Portrait mini={heroMini(hero.mini)} size={32} className={main ? "" : "opacity-60"} />
    </button>
  );
}

/** Notes clipped to three lines, with "more" to show them all in place when they don't fit. */
function Notes({ notes }: { notes: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setClipped(el.scrollHeight > el.clientHeight + 1);
  }, [notes, expanded]);

  return (
    <div className="mt-2.5 text-sm">
      <p ref={ref} className={`whitespace-pre-wrap break-words ${expanded ? "" : "line-clamp-3"}`}>
        {notes}
      </p>
      {(clipped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          className="mt-0.5 cursor-pointer text-xs text-hud-gold hover:underline"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}
