"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Glass } from "./Glass";
import { Button, IconButton } from "./Button";
import { Icon, type IconName } from "./icons";

/** `error` for a failure, `slain` for a slay (with Undo), `done` for a finished file save or load. */
export type ToastTone = "error" | "slain" | "done";

export type ToastOptions = {
  message: string;
  tone: ToastTone;
  /** A button on the toast, e.g. Undo with the `undo` icon. The toast closes once it has run. */
  action?: { label: string; run: () => void; icon?: IconName };
  /** Stays until it is dismissed or replaced, instead of hiding itself. */
  stay?: boolean;
};

export type ToastApi = {
  /** Shows a toast, replacing the one on screen. */
  show(options: ToastOptions): void;
  /** Hides the toast on screen, if any. */
  dismiss(): void;
};

/** How long each kind of toast stays before it hides itself. */
const DURATION_MS: Record<ToastTone, number> = { error: 6000, slain: 8000, done: 6000 };

const ToastContext = createContext<ToastApi | null>(null);

/** The toast API of the surrounding <ToastProvider>. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast() needs a <ToastProvider> above it");
  return api;
}

type Shown = ToastOptions & { id: number };

/**
 * Holds the one toast on screen and draws it at the bottom centre of the
 * window. Mounted once, in the root layout.
 *
 * It stacks over the table but under the HUD clusters (`z-30` in Hud.tsx)
 * and the dialogs.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null);

  const show = useCallback((options: ToastOptions) => {
    setToast((t) => ({ ...options, id: (t?.id ?? 0) + 1 }));
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />}
    </ToastContext>
  );
}

function ToastView({ toast, onDismiss }: { toast: Shown; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.stay) return;
    const t = setTimeout(onDismiss, DURATION_MS[toast.tone]);
    return () => clearTimeout(t);
  }, [toast.tone, toast.stay, onDismiss]);

  const error = toast.tone === "error";
  const { action } = toast;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <Glass
        role={error ? "alert" : "status"}
        className={`pointer-events-auto flex max-w-xl items-center gap-3 py-2 pr-2 pl-3.5 text-sm motion-safe:animate-hud-rise ${
          error ? "border-hud-danger/60" : ""
        }`}
      >
        {error ? (
          <Icon.warn className="size-5 shrink-0 text-hud-danger" />
        ) : toast.tone === "done" ? (
          <Icon.check className="size-5 shrink-0 text-hud-gold" />
        ) : (
          <Icon.trophy className="size-5 shrink-0 text-hud-gold" />
        )}
        <span className="min-w-0 flex-1">{toast.message}</span>
        {action && (
          <Button
            icon={action.icon}
            className="h-8"
            onClick={() => {
              action.run();
              onDismiss();
            }}
          >
            {action.label}
          </Button>
        )}
        <IconButton
          label="Dismiss"
          icon="close"
          className="size-8 border-transparent bg-transparent"
          onClick={onDismiss}
        />
      </Glass>
    </div>
  );
}
