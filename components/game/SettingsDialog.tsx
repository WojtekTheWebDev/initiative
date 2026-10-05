"use client";

import type { KeyboardEvent } from "react";
import { TERRAINS, type Terrain } from "@/lib/map/terrain";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/icons";
import { TerrainPreview } from "@/components/map/Table";
import { useGameStore, useSettings } from "./GameProvider";

const TERRAIN_INFO: Record<Terrain, { name: string; blurb: string }> = {
  mixed: { name: "Mixed lands", blurb: "All four lands in regions across the map, so panning feels like a journey." },
  meadow: { name: "Meadow", blurb: "Green felt, flowers, small woods and camps." },
  woods: { name: "Autumn woods", blurb: "Ochre felt, leaf litter and dense autumn trees." },
  highlands: { name: "Rocky highlands", blurb: "Grey-green hills, rocks, towers and stones." },
  marsh: { name: "Marsh", blurb: "Dark teal felt, reeds, puddles and old ruins." },
};

/**
 * How this browser shows the table. Terrain: one choice of what the map is
 * made of, each shown with a picture; a choice redraws the map at once and
 * never moves a figure. Arrow keys move the choice, like any radio group.
 */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { terrain } = useSettings();
  const { settings: store } = useGameStore();
  const choose = (t: Terrain) => store.update((s) => (s.terrain === t ? s : { ...s, terrain: t }));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = TERRAINS[(TERRAINS.indexOf(terrain) + step + TERRAINS.length) % TERRAINS.length];
    choose(next);
    e.currentTarget.querySelector<HTMLElement>(`[data-terrain="${next}"]`)?.focus();
  };

  return (
    <Dialog title="Settings" open={open} onClose={onClose} className="max-w-xl">
      <section aria-labelledby="settings-terrain" className="grid gap-3">
        <div className="grid gap-1">
          <h3 id="settings-terrain" className="font-display text-sm tracking-[0.08em] text-hud-fg uppercase">
            Terrain
          </h3>
          <p className="text-sm text-hud-muted">
            Choose the land your table is set in. The terrain is only scenery, so your figures stay where they are.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="settings-terrain"
          onKeyDown={onKeyDown}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {TERRAINS.map((t) => {
            const on = t === terrain;
            const wide = t === "mixed";
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                data-terrain={t}
                onClick={() => choose(t)}
                className={`grid cursor-pointer overflow-hidden rounded-lg border text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud-gold ${
                  on ? "border-hud-gold shadow-[0_0_0_1px_var(--hud-gold)]" : "border-hud-line hover:border-hud-gold/60"
                } ${wide ? "sm:col-span-2" : ""}`}
              >
                <span className={`relative block overflow-hidden ${wide ? "aspect-[16/10] sm:aspect-[16/5]" : "aspect-[16/10]"}`}>
                  <TerrainPreview
                    terrain={t}
                    aspect={wide ? 16 / 5 : 16 / 10}
                    zoomOut={wide ? 3 : 1}
                    className="block h-full w-full"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 90% at 46% 42%, rgba(255, 216, 150, 0.12) 0%, rgba(0, 0, 0, 0) 55%, rgba(8, 5, 2, 0.45) 100%)",
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute top-2 right-2 grid size-6 place-items-center rounded-full border ${
                      on ? "border-hud-gold bg-hud-gold text-black" : "border-hud-line bg-black/60 text-transparent"
                    }`}
                  >
                    <Icon.check className="size-4" />
                  </span>
                </span>
                <span className="grid gap-0.5 px-3 py-2.5">
                  <span className={`text-sm font-semibold ${on ? "text-hud-gold" : "text-hud-fg"}`}>
                    {TERRAIN_INFO[t].name}
                  </span>
                  <span className="text-xs text-hud-muted">{TERRAIN_INFO[t].blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-hud-muted">Settings are kept in this browser and aren&apos;t part of a save file.</p>
      </section>
    </Dialog>
  );
}
