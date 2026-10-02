"use client";

import { useEffect, useState, useTransition, type ButtonHTMLAttributes, type ReactNode } from "react";
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
      className="mt-3 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
    >
      <span className="flex-1">{error}</span>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss error"
          className="opacity-60 hover:opacity-100"
          onClick={onDismiss}
        >
          ✕
        </button>
      )}
    </div>
  );
}

type Tone = "default" | "primary" | "danger";

const TONES: Record<Tone, string> = {
  default: "border-foreground/20 hover:bg-foreground/10",
  primary: "border-transparent bg-foreground text-background hover:opacity-90",
  danger: "border-red-500/50 text-red-700 hover:bg-red-500/10 dark:text-red-300",
};

export function Button({
  tone = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}

/** How long the "click again" state lasts before it disarms itself. */
const CONFIRM_MS = 4000;

/**
 * A destructive button that needs two clicks. The second label must say
 * clearly that the action can't be undone.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  children: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      tone="danger"
      disabled={disabled}
      className={armed ? "bg-red-600! text-white! border-red-600!" : ""}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">{children}</h3>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-foreground/20 bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground/50 focus:ring-2 focus:ring-amber-500/30";
