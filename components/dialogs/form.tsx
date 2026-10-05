"use client";

import { useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/Button";

/**
 * Runs a dialog's change to the table. A thrown Error (a rule in lib/domain
 * refusing it) becomes `error`, shown with <ErrorNote>, and the dialog stays open.
 */
export function useAction() {
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => void) => {
    setError(null);
    try {
      fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return { error, run, clearError: () => setError(null) };
}

export function ErrorNote({ error, onDismiss }: { error: string | null; onDismiss?: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-[10px] border border-hud-danger/50 bg-hud-danger/10 py-1 pr-1 pl-3 text-sm text-[#ff9a9d]"
    >
      <span className="flex-1 py-1">{error}</span>
      {onDismiss && (
        <IconButton
          label="Dismiss error"
          icon="close"
          className="size-7 border-transparent bg-transparent"
          onClick={onDismiss}
        />
      )}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 mb-1 text-xs font-semibold tracking-wide text-hud-muted uppercase">{children}</h3>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs font-semibold tracking-wide text-hud-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[10px] border border-hud-line bg-black/30 px-2.5 py-1.5 text-sm text-hud-fg placeholder:text-hud-muted focus:border-hud-gold focus-visible:outline-none";

/** Readable text from anything an action threw. */
function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return "Something went wrong";
}
