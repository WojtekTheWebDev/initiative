import { useSyncExternalStore } from "react";
import { DOCK_BELOW } from "@/components/card/placeCard";

const QUERY = `(max-width: ${DOCK_BELOW - 1}px)`;

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/**
 * Whether the window is too narrow for the figure card to stand beside a
 * figure (a phone held upright), so it docks as a bottom sheet instead.
 */
export function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
