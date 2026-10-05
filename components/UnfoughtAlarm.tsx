"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Monster } from "@/lib/types";
import { monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/icons";

type Props = {
  /** Living monsters no hero is fighting. */
  monsters: Monster[];
  /** Called when a monster is picked from the list (the Board flies the camera to it). */
  onPick: (monster: Monster) => void;
};

/**
 * A red "N unfought" counter under the wordmark with a dropdown listing them.
 * Calm "All monsters engaged" when there are none.
 */
export function UnfoughtAlarm({ monsters, onPick }: Props) {
  const [isOpen, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const count = monsters.length;
  const open = isOpen && count > 0;

  // Close on outside press or Esc anywhere.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
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

  if (count === 0) {
    return (
      <Glass as="span" role="status" className="flex items-center gap-1.5 px-2.5 py-1 text-sm text-hud-gold">
        <Icon.swords className="size-4" />
        All monsters engaged
      </Glass>
    );
  }

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
        className="hud-glass flex cursor-pointer items-center gap-1.5 border-hud-danger/60 px-2.5 py-1 text-sm font-semibold text-[#ff9a9d] hover:bg-[#3a1416]"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onToggleKeyDown}
      >
        <Icon.warn className="size-4" />
        {count} unfought
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          aria-label="Unfought monsters"
          className="hud-glass absolute top-full left-0 z-20 mt-1 max-h-80 w-72 overflow-y-auto py-1"
          onKeyDown={onListKeyDown}
        >
          {monsters.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                onClick={() => pick(m)}
              >
                <Portrait mini={monsterMini(m.size)} size={24} ring="red" />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
