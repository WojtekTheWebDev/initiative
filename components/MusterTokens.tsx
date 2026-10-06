"use client";

import { useMemo } from "react";
import type { Monster } from "@/lib/types";
import { monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/icons";
import { FoldedList } from "@/components/ui/FoldedList";
import { muster } from "./muster";

type Props = {
  /** Living monsters no hero is fighting. */
  monsters: Monster[];
  /** Called when a token is picked (the Board flies the camera to the monster). */
  onPick: (monster: Monster) => void;
};

const TOKEN =
  "hud-glass flex max-w-60 cursor-pointer items-center gap-2 border-hud-danger/45 py-1 pr-3 pl-1 text-left text-sm hover:border-hud-danger hover:bg-hud-danger/15 motion-safe:transition-colors";

/**
 * The muster under the wordmark: a red "N unfought" count and one red-ringed
 * token per unfought monster, largest first, then by name (see `muster`).
 * Past six, the rest fold into "+N more", which opens a glass list of them. A
 * token flies the camera to its monster. With none unfought, a small gold
 * "All engaged" seal. On a phone (`compact`) there is no muster.
 */
export function MusterTokens({ monsters, onPick }: Props) {
  const { shown, folded } = useMemo(() => muster(monsters), [monsters]);

  if (monsters.length === 0) {
    return (
      <Glass as="p" role="status" className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-hud-gold compact:hidden">
        <Icon.swords className="size-3.5" />
        All engaged
      </Glass>
    );
  }

  return (
    <section aria-label="Unfought monsters" className="flex flex-col items-start gap-1.5 compact:hidden">
      <p
        role="status"
        className="flex items-center gap-1.5 px-1 text-sm font-semibold text-[#ff9a9d] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]"
      >
        <Icon.warn className="size-4" />
        {monsters.length} unfought
      </p>
      <ul className="flex flex-col items-start gap-1.5">
        {shown.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              aria-label={`Fly to unfought monster ${m.name}`}
              title={m.name}
              className={TOKEN}
              onClick={() => onPick(m)}
            >
              <Portrait mini={monsterMini(m)} size={28} ring="red" />
              <span className="min-w-0 truncate">{m.name}</span>
            </button>
          </li>
        ))}
        {folded.length > 0 && (
          <li>
            <FoldedList
              items={folded}
              itemKey={(m) => m.id}
              renderItem={(m) => ({
                label: `Fly to unfought monster ${m.name}`,
                title: m.name,
                content: (
                  <>
                    <Portrait mini={monsterMini(m)} size={24} ring="red" />
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  </>
                ),
              })}
              onPick={onPick}
              toggleLabel={`${folded.length} more unfought monsters`}
              listLabel="More unfought monsters"
              toggleClassName={`${TOKEN} px-3 font-semibold text-[#ff9a9d]`}
            />
          </li>
        )}
      </ul>
    </section>
  );
}
