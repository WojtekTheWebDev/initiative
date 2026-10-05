"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";

type Row = { keys: ReactNode; does: string };

const GESTURES: Row[] = [
  { keys: "Drag", does: "Pan the table, or move a figure" },
  { keys: "Drop a hero on a monster", does: "Make it the hero's only target" },
  { keys: <><Kbd>Shift</Kbd> + drop</>, does: "Add it as a secondary target" },
  { keys: "Wheel or pinch", does: "Zoom at the pointer" },
  { keys: <Kbd>Esc</Kbd>, does: "Cancel a drag, close what is open" },
];

const KEYS: Row[] = [
  { keys: <Kbd>N</Kbd>, does: "New monster" },
  { keys: <Kbd>H</Kbd>, does: "New hero" },
  { keys: <Kbd>F</Kbd>, does: "Fit everything" },
  { keys: <><Kbd>+</Kbd> <Kbd>-</Kbd></>, does: "Zoom in and out" },
  { keys: <Kbd>?</Kbd>, does: "This sheet" },
];

/** The glass card listing every gesture and key on the table. */
export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog title="Shortcuts" open={open} onClose={onClose} className="max-w-md">
      <Section title="Gestures" rows={GESTURES} />
      <Section title="Keys" rows={KEYS} />
      <p className="mt-4 text-xs text-hud-muted">Keys are ignored while typing in a field.</p>
    </Dialog>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="font-display mb-2 text-xs tracking-[0.12em] text-hud-gold/80 uppercase">{title}</h3>
      <dl className="grid grid-cols-[10.5rem_1fr] gap-x-5 gap-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.does} className="contents">
            <dt className="text-hud-fg">{r.keys}</dt>
            <dd className="text-hud-muted">{r.does}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-hud-line bg-white/5 px-1.5 font-sans text-xs text-hud-fg">
      {children}
    </kbd>
  );
}
