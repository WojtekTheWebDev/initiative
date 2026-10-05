"use client";

import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, ConfirmButton, IconButton } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { useToast } from "@/components/ui/Toast";

/**
 * Runs a card's Server Action in the background. The card closes at once
 * (`onStart`), since the figure is leaving the table; a failure shows an error
 * toast saying what failed.
 */
export function useCardAction() {
  const toast = useToast();
  return (what: string, action: () => Promise<unknown>, onStart: () => void) => {
    onStart();
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        const reason = err instanceof Error && err.message ? err.message : "the server didn't answer";
        toast.show({ tone: "error", message: `Couldn't ${what}: ${reason}.` });
      }
    });
  };
}

/** The card's heading: portrait, gold name and a line of facts below it. */
export function CardHeader({ portrait, name, facts }: { portrait: ReactNode; name: string; facts: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pr-16">
      {portrait}
      <div className="min-w-0">
        <h2 className="font-display text-base leading-tight break-words text-hud-gold">{name}</h2>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-hud-muted">{facts}</p>
      </div>
    </div>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return <h3 className="mt-3 mb-1.5 text-[11px] font-semibold tracking-wide text-hud-muted uppercase">{children}</h3>;
}

/** Edit, when the card is given an opener for its dialog. */
export function EditButton({ onEdit }: { onEdit?: () => void }) {
  if (!onEdit) return null;
  return (
    <Button icon="pen" className="h-8" onClick={onEdit}>
      Edit
    </Button>
  );
}

/**
 * The card's ⋯ menu in its top-right corner, holding Delete. Delete needs a
 * second click on a button that says it can't be undone. Esc or a press
 * outside closes the menu before the card.
 */
export function CardMenu({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); // this Esc closes the menu, not the card
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <IconButton
        label={`Menu for ${name}`}
        title="More"
        icon="dots"
        aria-expanded={open}
        className="size-8 border-transparent bg-transparent"
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Glass className="absolute top-full right-0 z-10 mt-1 w-max p-1.5 motion-safe:animate-hud-pop">
          <ConfirmButton className="h-8" confirmLabel="Delete for good? Can't be undone" onConfirm={onDelete}>
            Delete
          </ConfirmButton>
        </Glass>
      )}
    </div>
  );
}
