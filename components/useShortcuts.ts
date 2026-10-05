"use client";

import { useEffect, useRef } from "react";

export type ShortcutHandlers = {
  newMonster: () => void;
  newHero: () => void;
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  help: () => void;
};

/** Which handler each key runs. Letters match either case. */
const KEYS: Record<string, keyof ShortcutHandlers> = {
  n: "newMonster",
  h: "newHero",
  f: "fit",
  "+": "zoomIn",
  "=": "zoomIn",
  "-": "zoomOut",
  "?": "help",
};

/** Zoom keys repeat while held; the others fire once per press. */
const REPEATS = new Set<keyof ShortcutHandlers>(["zoomIn", "zoomOut"]);

/**
 * The table's keyboard shortcuts (`N`, `H`, `F`, `+` or `=`, `-`, `?`). Keys
 * are ignored with Ctrl, Meta or Alt held, while typing in a field, while a
 * dialog is open (`aria-modal="true"`, which owns its own keys, Esc among
 * them) and when another listener already claimed them.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const name = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!name || (e.repeat && !REPEATS.has(name))) return;
      if (isTyping(e.target) || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      latest.current[name]();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable]"));
}
