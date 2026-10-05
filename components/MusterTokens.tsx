"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Monster } from "@/lib/types";
import { monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/icons";
import { muster } from "./muster";

type Props = {
  /** Living monsters no hero is fighting, from the optimistic world. */
  monsters: Monster[];
  /** Called when a token is picked (the Board flies the camera to the monster). */
  onPick: (monster: Monster) => void;
};

const TOKEN =
  "hud-glass flex max-w-60 cursor-pointer items-center gap-2 border-hud-danger/45 py-1 pr-3 pl-1 text-left text-sm hover:border-hud-danger hover:bg-hud-danger/15 motion-safe:transition-colors";

/**
 * The muster under the wordmark: a red "N unfought" count and one red-ringed
 * token per unfought monster, largest first, then by name (see `muster`).
 * Past six, the rest fold into "+N", which opens a glass list of them. A
 * token flies the camera to its monster. With none unfought, a small gold
 * "All engaged" seal.
 */
export function MusterTokens({ monsters, onPick }: Props) {
  const { shown, folded } = useMemo(() => muster(monsters), [monsters]);

  if (monsters.length === 0) {
    return (
      <Glass as="p" role="status" className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-hud-gold">
        <Icon.swords className="size-3.5" />
        All engaged
      </Glass>
    );
  }

  return (
    <section aria-label="Unfought monsters" className="flex flex-col items-start gap-1.5">
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
              <Portrait mini={monsterMini(m.size)} size={28} ring="red" />
              <span className="min-w-0 truncate">{m.name}</span>
            </button>
          </li>
        ))}
        {folded.length > 0 && (
          <li>
            <FoldedList monsters={folded} onPick={onPick} />
          </li>
        )}
      </ul>
    </section>
  );
}

/** "+N" and the glass list of the folded tokens it opens. Arrow keys move through the list; Esc or a press outside closes it. */
function FoldedList({ monsters, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // this Esc closes the list, not the figure card
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items = () => Array.from(listRef.current?.querySelectorAll("button") ?? []);
  const focusItem = (index: number) => {
    const all = items();
    all[(index + all.length) % all.length]?.focus();
  };

  const onToggleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(0));
    }
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const index = items().indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") focusItem(index + 1);
    else if (e.key === "ArrowUp") focusItem(index - 1);
    else if (e.key === "Home") focusItem(0);
    else if (e.key === "End") focusItem(-1);
    else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  const pick = (m: Monster) => {
    setOpen(false);
    onPick(m);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${monsters.length} more unfought monsters`}
        className={`${TOKEN} px-3 font-semibold text-[#ff9a9d]`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onToggleKeyDown}
      >
        +{monsters.length}
      </button>
      {open && (
        <Glass
          as="ul"
          ref={listRef}
          id={listId}
          aria-label="More unfought monsters"
          className="absolute top-full left-0 z-20 mt-1.5 max-h-80 w-64 animate-hud-pop overflow-y-auto py-1"
          onKeyDown={onListKeyDown}
        >
          {monsters.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                aria-label={`Fly to unfought monster ${m.name}`}
                title={m.name}
                className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                onClick={() => pick(m)}
              >
                <Portrait mini={monsterMini(m.size)} size={24} ring="red" />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </Glass>
      )}
    </div>
  );
}
