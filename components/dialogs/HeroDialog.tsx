"use client";

import { useState, type FormEvent } from "react";
import type { Hero, Pos } from "@/lib/types";
import { createHero, updateHero } from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ErrorNote, Field, inputClass, useAction } from "./form";
import { MiniCarousel } from "./MiniCarousel";
import { heroFields, heroPatch, isDirty, type HeroFields } from "./helpers";

/**
 * "Recruit a hero" (create) or "Edit hero" (with `hero`), laid out like a
 * game's character screen: the mini carousel on the left, name and class on
 * the right. Mount it to open it; it calls `onClose` when done.
 */
export function HeroDialog({
  hero,
  spawnAt,
  onCreated,
  onClose,
}: {
  /** The hero to edit; absent to recruit a new one. */
  hero?: Hero;
  /** Where a new (idle) hero stands, asked for when it is recruited. */
  spawnAt: () => Pos;
  onCreated: (id: string, pos: Pos) => void;
  onClose: () => void;
}) {
  const [start] = useState(() => heroFields(hero));
  const [fields, setFields] = useState(start);
  const set = (patch: Partial<HeroFields>) => setFields((f) => ({ ...f, ...patch }));
  const { pending, error, run, clearError } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (hero) {
      const patch = heroPatch(hero, fields);
      run(async () => {
        if (Object.keys(patch).length > 0) await unwrap(updateHero(hero.id, patch));
        onClose();
      });
      return;
    }
    const pos = spawnAt();
    run(async () => {
      const id = await unwrap(
        createHero({ name: fields.name, class: fields.class, mini: fields.mini || undefined, pos }),
      );
      onClose();
      onCreated(id, pos);
    });
  };

  return (
    <Dialog
      open
      title={hero ? "Edit hero" : "Recruit a hero"}
      onClose={onClose}
      dirty={isDirty(start, fields)}
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <MiniCarousel value={fields.mini} onChange={(mini) => set({ mini })} />

        <div className="flex min-w-0 flex-col">
          <Field label="Name">
            <input
              className={inputClass}
              value={fields.name}
              onChange={(e) => set({ name: e.target.value })}
              required
              autoFocus
              placeholder="e.g. Ada"
            />
          </Field>

          <Field label="Class">
            <input
              className={inputClass}
              value={fields.class}
              onChange={(e) => set({ class: e.target.value })}
              required
              placeholder="e.g. backend engineer"
            />
          </Field>
          <div className="mt-auto flex justify-end gap-2 pt-5">
            <Button onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              tone="primary"
              disabled={pending || fields.name.trim() === "" || fields.class.trim() === ""}
            >
              {hero ? "Save" : "Recruit"}
            </Button>
          </div>
          <ErrorNote error={error} onDismiss={clearError} />
        </div>
      </form>
    </Dialog>
  );
}
