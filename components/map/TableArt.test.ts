import { describe, expect, it } from "vitest";
import { artSource, bridgeArt } from "./TableArt";

const rad = (deg: number) => (deg * Math.PI) / 180;

describe("bridgeArt", () => {
  it("picks the baked turn nearest to the road and turns the rest of the way", () => {
    expect(bridgeArt(0)).toEqual({ artKey: "bridge-0", rotate: 0 });
    expect(bridgeArt(rad(29))).toEqual({ artKey: "bridge-2", rotate: expect.closeTo(-1, 9) });
    expect(bridgeArt(rad(87))).toEqual({ artKey: "bridge-6", rotate: expect.closeTo(-3, 9) });
  });

  it("treats both directions along a road the same", () => {
    expect(bridgeArt(rad(-38))).toEqual(bridgeArt(rad(142)));
    expect(bridgeArt(rad(-13)).artKey).toBe("bridge-11");
    expect(bridgeArt(rad(-13)).rotate).toBeCloseTo(2, 9);
  });

  it("never turns a baked bridge by more than half a step", () => {
    for (let deg = -360; deg <= 360; deg += 0.5) {
      expect(Math.abs(bridgeArt(rad(deg)).rotate)).toBeLessThanOrEqual(7.5 + 1e-9);
    }
  });

  it("has baked art for every turn", () => {
    for (let turn = 0; turn < 12; turn++) {
      expect(artSource(`bridge-${turn}`).kind).toBe("image");
    }
  });
});
