"use client";

import { useId, useState, type FormEvent } from "react";
import type { Hero, Pos } from "@/lib/types";
import { HERO_CLASSES, heroGlyph } from "@/lib/map/glyphs";
import { createHero, updateHero } from "@/app/actions";
import { Button, ErrorNote, Field, inputClass, useAction } from "./ui";

type Props =
  | {
      /** Create: where the new (idle) hero stands. */
      spawnAt: () => Pos;
      onCreated: (id: string, pos: Pos) => void;
      hero?: undefined;
      onSaved?: undefined;
      onCancel: () => void;
    }
  | {
      hero: Hero;
      onSaved: () => void;
      spawnAt?: undefined;
      onCreated?: undefined;
      onCancel: () => void;
    };

export function HeroForm(props: Props) {
  const { hero, onCancel } = props;
  const listId = useId();
  const [name, setName] = useState(hero?.name ?? "");
  const [cls, setCls] = useState(hero?.class ?? "");
  const { pending, error, run, clearError } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (props.hero) {
      const h = props.hero;
      const patch: { name?: string; class?: string } = {};
      if (name.trim() !== h.name) patch.name = name;
      if (cls.trim() !== h.class) patch.class = cls;
      run(async () => {
        if (Object.keys(patch).length > 0) await updateHero(h.id, patch);
        props.onSaved();
      });
    } else {
      const pos = props.spawnAt();
      const { onCreated } = props;
      run(async () => {
        const id = await createHero({ name, class: cls, pos });
        onCreated(id, pos);
      });
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 className="pr-8 text-lg font-semibold">{hero ? "Edit hero" : "New hero"}</h2>

      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Ada"
        />
      </Field>

      <Field label="Class">
        <div className="flex items-center gap-2">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/20 text-xl"
            title="Glyph preview"
          >
            {heroGlyph(cls)}
          </span>
          <input
            className={inputClass}
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            list={listId}
            required
            placeholder="e.g. mage"
          />
        </div>
        <datalist id={listId}>
          {HERO_CLASSES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <div className="mt-5 flex gap-2">
        <Button
          type="submit"
          tone="primary"
          disabled={pending || name.trim() === "" || cls.trim() === ""}
        >
          {hero ? "Save" : "Create"}
        </Button>
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
      <ErrorNote error={error} onDismiss={clearError} />
    </form>
  );
}
