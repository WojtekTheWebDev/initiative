import type { Pos } from "@/lib/types";
import type { ViewportSize } from "@/lib/map/camera";

/** Where the card points: the centre of the figure's base on screen, and the base's half-width there. */
export type CardAnchor = Pos & { reach: number };

export type CardSize = { width: number; height: number };

export type CardPlacement = {
  /** The card's top-left corner, relative to the viewport. */
  left: number;
  top: number;
  /** The side of the figure the card sits on; the pointer is on the card's other edge. */
  side: "right" | "left";
  /** The pointer's distance from the card's top edge. */
  pointerY: number;
};

/** Screen px between the edge of the base and the card (the pointer fills it). */
export const CARD_GAP = 12;
/** Screen px the card keeps from every edge of the viewport. */
export const CARD_MARGIN = 12;
/** The pointer never comes closer than this to the card's top or bottom edge, so it stays on the straight part. */
export const POINTER_INSET = 18;

/**
 * Places the figure card next to a figure: to the right of its base, centred
 * on it with the pointer at the base. Near the right edge, where it wouldn't
 * fit, it flips to the left of the base. Either way it is clamped inside the
 * viewport, so it never leaves the screen, even when the figure does.
 */
export function placeCard(anchor: CardAnchor, card: CardSize, viewport: ViewportSize): CardPlacement {
  const right = anchor.x + anchor.reach + CARD_GAP;
  const fitsRight = right + card.width <= viewport.width - CARD_MARGIN;
  const side = fitsRight ? "right" : "left";
  const left = clamp(
    side === "right" ? right : anchor.x - anchor.reach - CARD_GAP - card.width,
    CARD_MARGIN,
    viewport.width - CARD_MARGIN - card.width,
  );
  const top = clamp(anchor.y - card.height / 2, CARD_MARGIN, viewport.height - CARD_MARGIN - card.height);
  const pointerY = clamp(anchor.y - top, POINTER_INSET, card.height - POINTER_INSET);
  return { left, top, side, pointerY };
}

/** `value` kept within [min, max]; `min` wins when the range is empty (a card larger than the viewport). */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Below this window width the card can't stand beside a figure without covering it, so it docks as a bottom sheet. */
export const DOCK_BELOW = 640;
/** Screen px the HUD's top clusters take on a phone (the wordmark, and the create buttons stacked). */
export const DOCK_CLEAR_TOP = 108;

/**
 * Where a figure's base should be brought on screen so it shows above the
 * docked card: centred across, and a little below the middle of the space
 * between `top` (the lowest HUD edge) and the card, since the mini rises
 * above its base. `null` when the whole figure already shows there.
 */
export function revealAbove(anchor: CardAnchor, card: CardSize, viewport: ViewportSize, top: number): Pos | null {
  const bottom = viewport.height - CARD_MARGIN - card.height - CARD_GAP;
  const shows =
    anchor.x - anchor.reach >= 0 &&
    anchor.x + anchor.reach <= viewport.width &&
    // The mini stands about two base half-widths tall.
    anchor.y - 2 * anchor.reach >= top &&
    anchor.y + anchor.reach <= bottom;
  if (shows) return null;
  return { x: viewport.width / 2, y: top + (bottom - top) * 0.6 };
}
