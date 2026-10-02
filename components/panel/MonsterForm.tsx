"use client";

import { useState, type FormEvent } from "react";
import type { Monster, Pos, Size } from "@/lib/types";
import { creatureOf } from "@/lib/domain";
import { monsterMini } from "@/lib/map/minis";
import { MiniPortrait } from "@/components/MiniPortrait";
import { createMonster, updateMonster } from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import { Button, ErrorNote, Field, inputClass, useAction } from "./ui";

const SIZES: Size[] = ["S", "M", "L", "XL"];

type Props =
  | {
      /** Create: where to put the new monster. */
      spawnAt: () => Pos;
      onCreated: (id: string, pos: Pos) => void;
      monster?: undefined;
      onSaved?: undefined;
      onCancel: () => void;
    }
  | {
      monster: Monster;
      onSaved: () => void;
      spawnAt?: undefined;
      onCreated?: undefined;
      onCancel: () => void;
    };

export function MonsterForm(props: Props) {
  const { monster, onCancel } = props;
  const [name, setName] = useState(monster?.name ?? "");
  const [size, setSize] = useState<Size>(monster?.size ?? "M");
  const [notes, setNotes] = useState(monster?.notes ?? "");
  const { pending, error, run, clearError } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (props.monster) {
      const m = props.monster;
      // Send only what changed, so untouched fields keep their YAML formatting.
      const patch: { name?: string; size?: Size; notes?: string } = {};
      if (name.trim() !== m.name) patch.name = name;
      if (size !== m.size) patch.size = size;
      if (notes !== (m.notes ?? "")) patch.notes = notes;
      run(async () => {
        if (Object.keys(patch).length > 0) await unwrap(updateMonster(m.id, patch));
        props.onSaved();
      });
    } else {
      const pos = props.spawnAt();
      const { onCreated } = props;
      run(async () => {
        const id = await unwrap(createMonster({ name, size, notes: notes || undefined, pos }));
        onCreated(id, pos);
      });
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 className="pr-8 text-lg font-semibold">{monster ? "Edit monster" : "New monster"}</h2>

      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Flaky CI"
        />
      </Field>

      <fieldset className="mt-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">Size</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((s) => (
            <label
              key={s}
              className={`flex cursor-pointer flex-col items-center rounded-md border px-1 py-1.5 text-xs has-focus-visible:ring-2 has-focus-visible:ring-amber-500/40 ${
                size === s ? "border-amber-500 bg-amber-500/15" : "border-foreground/20 hover:bg-foreground/5"
              }`}
            >
              <input
                type="radio"
                name="size"
                value={s}
                checked={size === s}
                onChange={() => setSize(s)}
                className="sr-only"
              />
              <MiniPortrait mini={monsterMini(s)} size={40} />
              <span className="font-semibold">{s}</span>
              <span className="opacity-70">{creatureOf(s)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Notes">
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </Field>

      <div className="mt-5 flex gap-2">
        <Button type="submit" tone="primary" disabled={pending || name.trim() === ""}>
          {monster ? "Save" : "Create"}
        </Button>
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
      <ErrorNote error={error} onDismiss={clearError} />
    </form>
  );
}
