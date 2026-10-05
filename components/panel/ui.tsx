"use client";

import { useState, useTransition, type ReactNode } from "react";
import { IconButton } from "@/components/ui/Button";
import { errorMessage } from "./helpers";

/**
 * Runs a Server Action in a transition. A thrown Error becomes `error`
 * (shown with <ErrorNote>) instead of crashing the page.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };
  return { pending, error, run, clearError: () => setError(null) };
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
