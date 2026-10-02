"use client";

import { useState } from "react";
import type { Monster } from "@/lib/types";
import { monsterGlyph } from "@/lib/map/glyphs";
import { trophiesOf } from "@/components/panel/helpers";

/** Above this many trophies the strip collapses to one scrollable line. */
const COLLAPSE_AT = 6;

/** Slain monsters below the map, newest first. Clicking one shows it read-only. */
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
    // Left padding keeps the content clear of the Next.js dev indicator.
    <footer className="flex shrink-0 items-start gap-3 border-t border-foreground/10 py-1.5 pr-4 pl-14 text-sm">
      <span className="shrink-0 py-1 font-medium opacity-70" title="Slain monsters">
        🏆 {trophies.length}
      </span>
      {trophies.length === 0 ? (
        <span className="py-1 opacity-50">No trophies yet. Slay a monster.</span>
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
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 hover:bg-foreground/10 ${
                  openId === m.id ? "border-amber-500 bg-amber-500/15" : "border-foreground/15"
                }`}
                onClick={() => onOpen(m.id)}
              >
                <span aria-hidden="true">{monsterGlyph(m.size)}</span>
                <span className="max-w-48 truncate">{m.name}</span>
                <span className="text-xs opacity-60">{m.slain}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {many && (
        <button
          type="button"
          className="shrink-0 rounded px-2 py-1 text-xs opacity-70 hover:bg-foreground/10 hover:opacity-100"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Collapse" : "Show all"}
        </button>
      )}
    </footer>
  );
}
