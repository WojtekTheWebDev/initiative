"use client";

import { useState, type FormEvent } from "react";
import type { Monster, Pos } from "@/lib/types";
import { createMonster, updateMonster } from "@/lib/domain";
import { useGameStore } from "@/components/game/GameProvider";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass, useAction } from "./form";
import { SizeSlider } from "./SizeSlider";
import { isDirty, monsterFields, monsterPatch, type MonsterFields } from "./helpers";

/**
 * "Summon a monster" (create) or "Edit monster" (with `monster`): a large
 * preview of the mini above the size slider, then name and notes. Mount it
 * to open it; it calls `onClose` when done.
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
    >
      <form onSubmit={submit}>
        <SizeSlider value={fields.size} onChange={(size) => set({ size })} />

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

        <Field label="Notes">
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={fields.notes}
            onChange={(e) => set({ notes: e.target.value })}
            rows={4}
          />
        </Field>

        <div className="mt-5 flex justify-end gap-2 max-sm:flex-col">
          <Button type="submit" tone="primary" disabled={fields.name.trim() === ""}>
            {monster ? "Save" : "Summon"}
          </Button>
        </div>
        <ErrorNote error={error} onDismiss={clearError} />
      </form>
    </Dialog>
  );
}
