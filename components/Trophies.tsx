"use client";

import { useState } from "react";
import type { Monster } from "@/lib/types";
import { monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { trophiesOf } from "@/components/panel/helpers";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/icons";

/** Above this many trophies the strip collapses to one scrollable line. */
const COLLAPSE_AT = 6;

/** Slain monsters in a glass strip at the bottom of the HUD, newest first. Clicking one shows it read-only. */
export function Trophies({
  monsters,
  openId,
  onOpen,
}: {
  monsters: Monster[];
  openId: string | null;
  onOpen: (id: string) => void;
}) {
  const trophies = trophiesOf(monsters);
  const many = trophies.length > COLLAPSE_AT;
  const [expanded, setExpanded] = useState(false);
  const wrap = !many || expanded;

  return (
    <Glass as="footer" className="flex min-w-0 items-start gap-3 px-3 py-1.5 text-sm">
      <span className="flex shrink-0 items-center gap-1.5 py-1 font-medium text-hud-gold" title="Slain monsters">
        <Icon.trophy className="size-4" />
        {trophies.length}
      </span>
      {trophies.length === 0 ? (
        <span className="py-1 text-hud-muted">No trophies yet. Slay a monster.</span>
      ) : (
        <ul
          className={`flex min-w-0 flex-1 gap-1.5 ${
            wrap ? "max-h-32 flex-wrap overflow-y-auto" : "overflow-x-auto whitespace-nowrap"
          }`}
        >
          {trophies.map((m) => (
            <li key={m.id} className="shrink-0">
              <button
                type="button"
                title={`${m.name}, slain ${m.slain}`}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 hover:bg-white/10 ${
                  openId === m.id ? "border-hud-gold bg-hud-gold/15" : "border-hud-line"
                }`}
                onClick={() => onOpen(m.id)}
              >
                <Portrait mini={monsterMini(m.size)} size={20} bronze />
                <span className="max-w-48 truncate">{m.name}</span>
                <span className="text-xs text-hud-muted">{m.slain}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {many && (
        <button
          type="button"
          className="shrink-0 rounded px-2 py-1 text-xs text-hud-muted hover:bg-white/10 hover:text-hud-fg"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Collapse" : "Show all"}
        </button>
      )}
    </Glass>
  );
}
