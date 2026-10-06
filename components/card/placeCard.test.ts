import { describe, expect, it } from "vitest";
import { CARD_GAP, CARD_MARGIN, POINTER_INSET, placeCard, revealAbove } from "./placeCard";

const viewport = { width: 1000, height: 700 };
const card = { width: 280, height: 200 };

describe("placeCard", () => {
  it("sits right of the base, centred on it, with the pointer at the base", () => {
    const p = placeCard({ x: 300, y: 350, reach: 30 }, card, viewport);
    expect(p).toEqual({ left: 300 + 30 + CARD_GAP, top: 250, side: "right", pointerY: 100 });
  });

  it("flips to the left of the base near the right edge", () => {
    const p = placeCard({ x: 800, y: 350, reach: 30 }, card, viewport);
    expect(p.side).toBe("left");
    expect(p.left).toBe(800 - 30 - CARD_GAP - card.width);
    expect(p.left + card.width).toBeLessThan(800 - 30);
  });

  it("stays right while it still fits, exactly up to the margin", () => {
    const x = viewport.width - CARD_MARGIN - card.width - CARD_GAP - 30;
    expect(placeCard({ x, y: 350, reach: 30 }, card, viewport).side).toBe("right");
    expect(placeCard({ x: x + 1, y: 350, reach: 30 }, card, viewport).side).toBe("left");
  });

  it("clamps to the top and bottom, keeping the pointer on the card", () => {
    const high = placeCard({ x: 300, y: 20, reach: 30 }, card, viewport);
    expect(high.top).toBe(CARD_MARGIN);
    expect(high.pointerY).toBe(POINTER_INSET);
    const low = placeCard({ x: 300, y: 690, reach: 30 }, card, viewport);
    expect(low.top).toBe(viewport.height - CARD_MARGIN - card.height);
    expect(low.pointerY).toBe(card.height - POINTER_INSET);
  });

  it("follows the base along the edge without leaving the pointer's range", () => {
    const p = placeCard({ x: 300, y: 150, reach: 30 }, card, viewport);
    expect(p.top).toBe(50);
    expect(p.pointerY).toBe(100);
  });

  it("stays on screen when the figure is off it", () => {
    for (const anchor of [
      { x: -400, y: -300, reach: 30 },
      { x: 2000, y: 1500, reach: 30 },
      { x: -50, y: 350, reach: 30 },
    ]) {
      const p = placeCard(anchor, card, viewport);
      expect(p.left).toBeGreaterThanOrEqual(CARD_MARGIN);
      expect(p.left + card.width).toBeLessThanOrEqual(viewport.width - CARD_MARGIN);
      expect(p.top).toBeGreaterThanOrEqual(CARD_MARGIN);
      expect(p.top + card.height).toBeLessThanOrEqual(viewport.height - CARD_MARGIN);
    }
  });

  it("keeps the top-left corner on screen when the viewport is smaller than the card", () => {
    const p = placeCard({ x: 100, y: 100, reach: 30 }, card, { width: 200, height: 150 });
    expect(p.left).toBe(CARD_MARGIN);
    expect(p.top).toBe(CARD_MARGIN);
  });
});

describe("revealAbove", () => {
  const phone = { width: 390, height: 660 };
  const sheet = { width: 366, height: 220 };
  const bottom = phone.height - CARD_MARGIN - sheet.height - CARD_GAP;

  it("leaves a figure that already shows between the HUD and the card", () => {
    expect(revealAbove({ x: 200, y: 300, reach: 20 }, sheet, phone, 110)).toBeNull();
  });

  it("brings a figure under the card up into the clear space, centred across", () => {
    const at = revealAbove({ x: 200, y: 500, reach: 20 }, sheet, phone, 110);
    expect(at).toEqual({ x: 195, y: 110 + (bottom - 110) * 0.6 });
  });

  it("brings in a figure under the top HUD or off the side", () => {
    expect(revealAbove({ x: 200, y: 120, reach: 20 }, sheet, phone, 110)).not.toBeNull();
    expect(revealAbove({ x: 380, y: 300, reach: 20 }, sheet, phone, 110)).not.toBeNull();
  });
});
