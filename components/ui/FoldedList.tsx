"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Glass } from "./Glass";

/**
 * "+N more" and the glass list of folded tokens it opens, under the toggle.
 * Arrow keys move through the list; Esc or a press outside closes it. Each
 * item is a button drawn by `renderItem`; picking one closes the list first.
 */
export function FoldedList<T>({
  items,
  itemKey,
  renderItem,
  onPick,
  toggleLabel,
  listLabel,
  toggleClassName,
  align = "left",
}: {
  items: T[];
  itemKey: (item: T) => string;
  /** One list button's content, with its accessible name and title. */
  renderItem: (item: T) => { label: string; title: string; content: ReactNode };
  onPick: (item: T) => void;
  /** The toggle's accessible name. */
  toggleLabel: string;
  listLabel: string;
  toggleClassName: string;
  /** The side of the toggle the list lines up with. */
  align?: "left" | "right";
}) {
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

  const buttons = () => Array.from(listRef.current?.querySelectorAll("button") ?? []);
  const focusItem = (index: number) => {
    const all = buttons();
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
    const index = buttons().indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") focusItem(index + 1);
    else if (e.key === "ArrowUp") focusItem(index - 1);
    else if (e.key === "Home") focusItem(0);
    else if (e.key === "End") focusItem(-1);
    else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  const pick = (item: T) => {
    setOpen(false);
    onPick(item);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={toggleLabel}
        className={toggleClassName}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onToggleKeyDown}
      >
        +{items.length} more
      </button>
      {open && (
        <Glass
          as="ul"
          ref={listRef}
          id={listId}
          aria-label={listLabel}
          className={`absolute top-full z-20 mt-1.5 max-h-80 w-64 animate-hud-pop overflow-y-auto py-1 ${align === "left" ? "left-0" : "right-0"}`}
          onKeyDown={onListKeyDown}
        >
          {items.map((item) => {
            const { label, title, content } = renderItem(item);
            return (
              <li key={itemKey(item)}>
                <button
                  type="button"
                  aria-label={label}
                  title={title}
                  className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                  onClick={() => pick(item)}
                >
                  {content}
                </button>
              </li>
            );
          })}
        </Glass>
      )}
    </div>
  );
}
