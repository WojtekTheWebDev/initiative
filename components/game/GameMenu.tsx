"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { backupDue, daysAgo, type GameState } from "@/lib/save/game";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/icons";
import { AboutDialog } from "./AboutDialog";
import { SettingsDialog } from "./SettingsDialog";
import { useGame } from "./GameProvider";
import type { GameFiles } from "./useGameFiles";

/** "⌘" on a Mac, "Ctrl" elsewhere, for the menu's key hints. */
function modKey(): string {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";
}

/**
 * The wordmark in the top-left corner, which opens the game menu: Save game
 * to file, Load game from file, New game, Settings and About, over a line saying where the
 * table is kept and when it was last saved to a file. After `BACKUP_DAYS` of
 * unsaved changes an amber dot sits on the wordmark.
 *
 * It also binds ⌘S (Ctrl+S) and ⌘O (Ctrl+O), in place of the browser's own
 * save and open, while no dialog is open.
 */
export function GameMenu({ files }: { files: GameFiles }) {
  const state = useGame();
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const [settings, setSettings] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const due = backupDue(state.game, new Date());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key !== "s" && key !== "o") return;
      e.preventDefault();
      if (document.querySelector('[aria-modal="true"]')) return;
      setOpen(false);
      if (key === "s") files.save();
      else files.pick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [files]);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); // this Esc closes the menu, nothing under it
      setOpen(false);
      ref.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (run: () => void) => () => {
    setOpen(false);
    run();
  };
  const mod = modKey();

  return (
    <div ref={ref} className="relative">
      <Glass className="relative">
        <h1>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            title={due ? "Game menu: your changes haven't been saved to a file for a week" : "Game menu"}
            onClick={() => setOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-2.5 rounded-hud px-3.5 py-2 text-hud-gold hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-hud-gold"
          >
            <Icon.swords className="size-5" />
            <span className="font-display text-base leading-none tracking-[0.14em] uppercase">Initiative</span>
            <Icon.chevronDown
              className={`size-3.5 opacity-70 motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </h1>
        {due && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-hud-warn shadow-[0_0_8px_rgba(240,164,58,0.8)]"
          />
        )}
      </Glass>
      {open && (
        <Glass
          role="menu"
          aria-label="Game"
          className="absolute top-full left-0 z-10 mt-2 grid w-72 gap-0.5 p-1.5 motion-safe:animate-hud-pop"
        >
          <Item icon="save" keys={`${mod}S`} onClick={choose(files.save)}>
            Save game to file
          </Item>
          <Item icon="load" keys={`${mod}O`} onClick={choose(files.pick)}>
            Load game from file
          </Item>
          <hr className="mx-1.5 my-1 border-hud-line" />
          <Item icon="newGame" onClick={choose(files.openNewGame)}>
            New game…
          </Item>
          <Item icon="settings" onClick={choose(() => setSettings(true))}>
            Settings
          </Item>
          <Item icon="info" onClick={choose(() => setAbout(true))}>
            About Initiative
          </Item>
          <hr className="mx-1.5 my-1 border-hud-line" />
          <Footer state={state} due={due} />
        </Glass>
      )}
      <AboutDialog
        open={about}
        onClose={() => {
          setAbout(false);
          ref.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
        }}
      />
      <SettingsDialog
        open={settings}
        onClose={() => {
          setSettings(false);
          ref.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
        }}
      />
    </div>
  );
}

function Item({
  icon,
  keys,
  onClick,
  children,
}: {
  icon: IconName;
  keys?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const IconSvg = Icon[icon];
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
    >
      <IconSvg className="size-4 shrink-0 text-hud-gold" />
      <span className="flex-1">{children}</span>
      {keys && <kbd className="font-sans text-xs text-hud-muted">{keys}</kbd>}
    </button>
  );
}

/** Where the table is kept, and when it was last saved to a file; in amber once a save is due. */
function Footer({ state, due }: { state: GameState; due: boolean }) {
  const { game, storage } = state;
  const saved =
    due && game.unsavedSince
      ? `Changes from the last ${daysAgo(game.unsavedSince, new Date())} days aren't in a file`
      : game.fileSavedAt === null
        ? "Never saved to a file"
        : `Last saved to a file ${ago(game.fileSavedAt)}`;
  return (
    <div className="grid gap-0.5 px-2.5 pt-0.5 pb-1.5 text-xs text-hud-muted">
      {storage === "ok" ? (
        <span>Your table is kept in this browser.</span>
      ) : (
        <span className="text-[#ff9a9d]">This browser won&apos;t keep your table. Save it to a file.</span>
      )}
      <span className={`flex items-center gap-1.5 ${due ? "text-hud-warn" : ""}`}>
        {due && <span aria-hidden="true" className="size-2 rounded-full bg-hud-warn" />}
        {saved}
      </span>
    </div>
  );
}

function ago(iso: string): string {
  const days = daysAgo(iso, new Date());
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
