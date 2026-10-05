"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A centred glass dialog over the dimmed table, rendered into `document.body`.
 * Its panel is dense glass without the backdrop blur (`hud-glass-dense`).
 * On a screen too short for it, the body scrolls under the title and the
 * close button, which stay in view.
 *
 * - Focus moves into it on open (to an `autoFocus` field, else the first
 *   control), Tab stays inside it, and focus returns to where it was on close.
 * - Esc closes it unless something inside already claimed the key with
 *   `preventDefault()`; it claims the key itself, so listeners outside it can
 *   tell the Esc is taken.
 * - A click on the dim closes it only when nothing has been typed (`!dirty`).
 *
 * The close button and Esc are the only ways out besides the dialog's own
 * actions, so a dialog has no Cancel button.
 *
 * The panel is `role="dialog"` with `aria-modal="true"`, which is how other
 * HUD code (keyboard shortcuts) can tell a dialog is open.
 */
export function Dialog({
  title,
  open,
  onClose,
  dirty = false,
  className = "",
  children,
}: {
  title: ReactNode;
  open: boolean;
  onClose: () => void;
  /** Something has been typed, so a stray click on the dim must not throw it away. */
  dirty?: boolean;
  /** Extra classes for the panel, e.g. its width. */
  className?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return createPortal(
    <DialogPanel title={title} onClose={onClose} dirty={dirty} className={className}>
      {children}
    </DialogPanel>,
    document.body,
  );
}

function DialogPanel({
  title,
  onClose,
  dirty,
  className,
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  dirty: boolean;
  className: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const pressedDim = useRef(false);
  // Read while rendering, before an `autoFocus` field inside takes the focus.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    const el = panel.current;
    if (el && !el.contains(document.activeElement)) {
      const first = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
        (f) => !f.hasAttribute("data-dialog-close"),
      );
      (first ?? el).focus();
    }
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      if (e.defaultPrevented) return;
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const all = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (all.length === 0) {
      e.preventDefault();
      return;
    }
    const first = all[0];
    const last = all[all.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 motion-safe:animate-hud-fade"
      onPointerDown={(e) => {
        pressedDim.current = e.target === e.currentTarget;
      }}
      onMouseDown={(e) => {
        // Keep focus inside the panel, so Esc and Tab still reach it after a press on the dim.
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onClick={(e) => {
        if (pressedDim.current && e.target === e.currentTarget && !dirty) onClose();
        pressedDim.current = false;
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`hud-glass-dense relative flex max-h-full w-full max-w-lg flex-col outline-none motion-safe:animate-hud-pop ${className}`}
      >
        <h2 id={titleId} className="font-display shrink-0 px-5 pt-5 pr-10 text-lg tracking-[0.08em] text-hud-gold uppercase">
          {title}
        </h2>
        <IconButton
          label="Close"
          title="Close (Esc)"
          icon="close"
          data-dialog-close=""
          className="absolute top-3 right-3 border-transparent bg-transparent"
          onClick={onClose}
        />
        <div className="mt-4 min-h-0 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
