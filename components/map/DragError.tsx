"use client";

import { useEffect, useRef } from "react";

/** How long the error stays before it hides itself. */
const AUTO_HIDE_MS = 6000;

/** A small self-contained toast for a failed drag or ghost action (the change has been reverted). */
export function DragError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div
      role="alert"
      className="pointer-events-auto absolute bottom-3 left-1/2 z-20 flex max-w-[90%] -translate-x-1/2 items-start gap-3 rounded-md border border-red-600/40 bg-background px-3 py-2 text-sm text-red-700 shadow-lg dark:text-red-400"
    >
      <span>Couldn&apos;t save: {message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}
