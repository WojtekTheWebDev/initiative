"use client";

import { useState, type FormEvent } from "react";
import type { Monster, Pos } from "@/lib/types";
import { createMonster, updateMonster } from "@/lib/domain";
import { useGameStore } from "@/components/game/GameProvider";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass, useAction } from "./form";
import { MONSTER_MINIS, SIZE_MINI } from "@/lib/map/minis";
import { MiniCarousel, MissingNote } from "./MiniCarousel";
import { SizeSlider } from "./SizeSlider";
import { isDirty, monsterFields, monsterPatch, rosterIndex, type MonsterFields } from "./helpers";

/**
 * "Summon a monster" (create) or "Edit monster" (with `monster`), laid out
 * like the hero dialog: the mini carousel on the left, flipping through the
 * bestiary, and the size slider, name and notes on the right. Until a mini is
 * picked, the carousel shows the mini for the size and follows the slider;
 * a pick that isn't in the bestiary shows as missing, with that mini on show.
 * Mount it to open it; it calls `onClose` when done.
 */
export function MonsterDialog({
  monster,
  spawnAt,
  onCreated,
  onClose,
}: {
  /** The monster to edit; absent to summon a new one. */
  monster?: Monster;
  /** Where a new monster stands, asked for when it is summoned. */
  spawnAt: () => Pos;
  onCreated: (id: string, pos: Pos) => void;
  onClose: () => void;
}) {
  const [start] = useState(() => monsterFields(monster));
  const [fields, setFields] = useState(start);
  const set = (patch: Partial<MonsterFields>) => setFields((f) => ({ ...f, ...patch }));
  const { store } = useGameStore();
  const { error, run, clearError } = useAction();
  const { index, missing } = rosterIndex(MONSTER_MINIS, fields.mini, SIZE_MINI[fields.size]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (monster) {
      const patch = monsterPatch(monster, fields);
      run(() => {
        if (Object.keys(patch).length > 0) store.update((w) => updateMonster(w, monster.id, patch));
        onClose();
      });
      return;
    }
    const pos = spawnAt();
    run(() => {
      let id = "";
      store.update((w) => {
        const created = createMonster(w, {
          name: fields.name.trim(),
          size: fields.size,
          mini: fields.mini || undefined,
          notes: fields.notes || undefined,
          pos,
        });
        id = created.id;
        return created.world;
      });
      onClose();
      onCreated(id, pos);
    });
  };

  return (
    <Dialog
      open
      title={monster ? "Edit monster" : "Summon a monster"}
      onClose={onClose}
      dirty={isDirty(start, fields)}
      className="max-w-2xl!"
    >
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <MiniCarousel
          roster={MONSTER_MINIS}
          index={index}
          name={MONSTER_MINIS[index].name}
          onFlip={(mini) => set({ mini: mini.id })}
          note={
            missing ? (
              <MissingNote>
                &ldquo;{fields.mini}&rdquo; is missing, so this monster stands as the mini for its size. Flip to choose
                again.
              </MissingNote>
            ) : (
              fields.mini === "" && <p className="mt-2 text-xs text-hud-muted">Follows the size until you pick one</p>
            )
          }
        />

        <div className="flex min-w-0 flex-col">
          <Field label="Name">
            <input
              className={inputClass}
              value={fields.name}
              onChange={(e) => set({ name: e.target.value })}
              required
              autoFocus
              placeholder="e.g. Flaky CI"
            />
          </Field>

          <div className="mt-3">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-hud-muted uppercase" aria-hidden="true">
              Size
            </span>
            <SizeSlider value={fields.size} onChange={(size) => set({ size })} />
          </div>

          <Field label="Notes">
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={fields.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={4}
            />
          </Field>

          <div className="mt-auto flex justify-end gap-2 pt-5 max-sm:flex-col">
            <Button type="submit" tone="primary" disabled={fields.name.trim() === ""}>
              {monster ? "Save" : "Summon"}
            </Button>
          </div>
          <ErrorNote error={error} onDismiss={clearError} />
        </div>
      </form>
    </Dialog>
  );
}
