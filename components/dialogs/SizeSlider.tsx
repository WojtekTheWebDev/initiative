"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { Size } from "@/lib/types";
import { creatureOf } from "@/lib/domain";
import { monsterMini } from "@/lib/map/minis";
import { Portrait } from "@/components/ui/Portrait";
import { SIZES } from "./helpers";

/** Diameter of the preview above the slider, in px; half that on a phone (`compact`). */
const PREVIEW = 176;

/**
 * The monster's size: a large preview of its mini above a slider with four
 * labelled stops (S spider, M orc, L mushroom king, XL dragon). Arrow keys,
 * Home and End move it, and so do a click or a drag along the track.
 */
export function SizeSlider({ value, onChange }: { value: Size; onChange: (size: Size) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const index = SIZES.indexOf(value);
  const last = SIZES.length - 1;
  const set = (i: number) => {
    const next = SIZES[Math.min(last, Math.max(0, i))];
    if (next !== value) onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowDown: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index + 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in step)) return;
    e.preventDefault();
    set(step[e.key]);
  };

  /** Snaps to the stop nearest the pointer. */
  const follow = (e: PointerEvent) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    set(Math.round(((e.clientX - rect.left) / rect.width) * last));
  };

  return (
    <div>
      <div className="flex justify-center" aria-hidden="true">
        <Portrait mini={monsterMini(value)} size={PREVIEW} ring="gold" className="compact:[zoom:0.5]" />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Size"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={index}
        aria-valuetext={`${value}, ${creatureOf(value)}`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          follow(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) follow(e);
        }}
        className="mt-4 cursor-pointer touch-none rounded-[10px] px-[12.5%] py-2 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud-gold"
      >
        <div ref={track} className="relative h-1.5 rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-hud-gold/70"
            style={{ width: `${(index / last) * 100}%` }}
          />
          {SIZES.map((s, i) => (
            <span
              key={s}
              className={`absolute top-1/2 size-2.5 -translate-1/2 rounded-full ${i <= index ? "bg-hud-gold" : "bg-white/25"}`}
              style={{ left: `${(i / last) * 100}%` }}
            />
          ))}
          <span
            className="absolute top-1/2 size-5 -translate-1/2 rounded-full border-2 border-hud-gold bg-[#1b1408] shadow-md motion-safe:transition-[left]"
            style={{ left: `${(index / last) * 100}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 text-center text-xs" aria-hidden="true">
        {SIZES.map((s) => (
          <span
            key={s}
            className={`cursor-pointer py-1 ${s === value ? "text-hud-gold" : "text-hud-muted"}`}
            onClick={() => onChange(s)}
          >
            <span className="block font-semibold">{s}</span>
            <span className="block">{creatureOf(s)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
