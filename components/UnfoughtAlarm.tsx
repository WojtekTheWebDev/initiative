"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Monster } from "@/lib/types";
import { monsterGlyph } from "@/lib/map/glyphs";

type Props = {
  /** Living monsters no hero is fighting. */
  monsters: Monster[];
  /** Called when a monster is picked from the list (the Board flies the camera to it). */
  onPick: (monster: Monster) => void;
};

/**
 * Header counter "⚠ N unfought" with a dropdown listing them. Calm
 * "All monsters engaged" when there are none.
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
      <span className="rounded px-2 py-1 text-sm text-emerald-700 dark:text-emerald-400" role="status">
        ✓ All monsters engaged
      </span>
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
        className="rounded-md bg-red-600/10 px-2.5 py-1 text-sm font-semibold text-red-700 ring-1 ring-red-600/30 hover:bg-red-600/20 dark:text-red-400"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onToggleKeyDown}
      >
        ⚠ {count} unfought
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          aria-label="Unfought monsters"
          className="absolute top-full right-0 z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-md border border-foreground/10 bg-background py-1 shadow-lg"
          onKeyDown={onListKeyDown}
        >
          {monsters.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none"
                onClick={() => pick(m)}
              >
                <span aria-hidden="true" className="text-base">
                  {monsterGlyph(m.size)}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
