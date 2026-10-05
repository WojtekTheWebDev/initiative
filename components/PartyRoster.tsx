"use client";

import { useMemo } from "react";
import type { Hero, World } from "@/lib/types";
import { heroMini, monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { Icon } from "@/components/ui/icons";
import { FoldedList } from "@/components/ui/FoldedList";
import { party, type PartyMember } from "./party";

const TOKEN =
  "hud-glass flex w-72 cursor-pointer items-center gap-2 py-1 pr-1.5 pl-1 text-left text-sm hover:border-hud-gold/80 hover:bg-hud-gold/10 motion-safe:transition-colors";

/**
 * The party roster under the create buttons: a gold "N heroes · M idle"
 * count and one token per hero, engaged first, then idle, each by name (see
 * `party`). A token shows the hero, their main target with its crown and
 * "+N" for secondary targets; an idle hero's token is faded and says "Idle".
 * Past six, the rest fold into "+N more". A token selects its hero, which
 * opens the figure card and flies the camera there; the selected hero's
 * token is lit gold. With no heroes, or on a phone (`compact`), there is
 * no roster.
 */
export function PartyRoster({
  world,
  selectedId,
  onPick,
}: {
  /** The world in the game. */
  world: World;
  /** The selected hero, if any. */
  selectedId: string | null;
  onPick: (hero: Hero) => void;
}) {
  const { shown, folded, idle } = useMemo(() => party(world), [world]);
  const count = world.heroes.length;
  if (count === 0) return null;

  return (
    <section aria-label="Party" className="flex flex-col items-end gap-1.5 compact:hidden">
      <p className="flex items-center gap-1.5 px-1 text-sm font-semibold text-hud-gold [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        <Icon.swords className="size-4" />
        {count} {count === 1 ? "hero" : "heroes"}
        {idle > 0 && ` · ${idle} idle`}
      </p>
      <ul className="flex flex-col items-end gap-1.5">
        {shown.map((m) => {
          const selected = m.hero.id === selectedId;
          return (
            <li key={m.hero.id}>
              <button
                type="button"
                aria-label={tokenLabel(m)}
                aria-pressed={selected}
                title={m.hero.name}
                className={`${TOKEN} ${selected ? "border-hud-gold bg-hud-gold/15" : ""}`}
                onClick={() => onPick(m.hero)}
              >
                <MemberContent member={m} />
              </button>
            </li>
          );
        })}
        {folded.length > 0 && (
          <li>
            <FoldedList
              items={folded}
              itemKey={(m) => m.hero.id}
              renderItem={(m) => ({ label: tokenLabel(m), title: m.hero.name, content: <MemberContent member={m} /> })}
              onPick={(m) => onPick(m.hero)}
              toggleLabel={`${folded.length} more heroes`}
              listLabel="More heroes"
              toggleClassName={`${TOKEN} w-auto px-3 font-semibold text-hud-gold`}
              align="right"
            />
          </li>
        )}
      </ul>
    </section>
  );
}

function tokenLabel({ hero, main, secondary }: PartyMember) {
  if (!main) return `Select ${hero.name} (idle)`;
  const more = secondary ? ` and ${secondary} more` : "";
  return `Select ${hero.name} (fighting ${main.name}${more})`;
}

/** A hero's portrait and name, then their main target or "Idle". */
function MemberContent({ member: { hero, main, secondary } }: { member: PartyMember }) {
  return (
    <>
      <Portrait mini={heroMini(hero.mini)} size={28} className={main ? "" : "opacity-60"} />
      <span className={`min-w-0 flex-1 truncate ${main ? "" : "text-hud-muted"}`}>{hero.name}</span>
      {main ? (
        <>
          <span className="flex max-w-36 min-w-0 items-center gap-1.5 rounded-full bg-white/[0.06] py-0.5 pr-2 pl-0.5 text-[13px] text-hud-muted">
            <Portrait mini={monsterMini(main.size)} size={20} />
            <span className="min-w-0 truncate">{main.name}</span>
            <Icon.crown className="size-3.5 shrink-0 text-hud-gold" />
          </span>
          {secondary > 0 && <span className="w-5 shrink-0 text-xs font-semibold text-hud-gold">+{secondary}</span>}
        </>
      ) : (
        <span className="pr-2 text-[13px] text-hud-muted italic">Idle</span>
      )}
    </>
  );
}
