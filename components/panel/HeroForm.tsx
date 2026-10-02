"use client";

import { useState, type FormEvent } from "react";
import type { Hero, Pos } from "@/lib/types";
import { HERO_MINIS, NEUTRAL_MINI, isHeroMini } from "@/lib/map/minis";
import { createHero, updateHero } from "@/app/actions";
import { unwrap } from "@/lib/action-result";
import { MiniPortrait } from "@/components/MiniPortrait";
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
  const [name, setName] = useState(hero?.name ?? "");
  const [cls, setCls] = useState(hero?.class ?? "");
  /** The hero's `mini`: "" for none, which draws the neutral adventurer. */
  const [mini, setMini] = useState(hero?.mini ?? "");
  const { pending, error, run, clearError } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (props.hero) {
      const h = props.hero;
      const patch: { name?: string; class?: string; mini?: string } = {};
      if (name.trim() !== h.name) patch.name = name;
      if (cls.trim() !== h.class) patch.class = cls;
      if (mini !== (h.mini ?? "")) patch.mini = mini;
      run(async () => {
        if (Object.keys(patch).length > 0) await unwrap(updateHero(h.id, patch));
        props.onSaved();
      });
    } else {
      const pos = props.spawnAt();
      const { onCreated } = props;
      run(async () => {
        const id = await unwrap(createHero({ name, class: cls, mini: mini || undefined, pos }));
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
        <input
          className={inputClass}
          value={cls}
          onChange={(e) => setCls(e.target.value)}
          required
          placeholder="e.g. backend engineer"
        />
      </Field>

      <MiniPicker value={mini} onChange={setMini} />

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

/**
 * A grid of baked mini portraits, "Neutral" first, with the current pick
 * ringed. A pick that isn't in the roster shows as missing, with Neutral
 * ringed (that is how the hero is drawn), so you can choose again.
 */
function MiniPicker({ value, onChange }: { value: string; onChange: (mini: string) => void }) {
  const missing = value !== "" && !isHeroMini(value);
  const current = isHeroMini(value) ? value : NEUTRAL_MINI;
  return (
    <fieldset className="mt-3">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">Mini</legend>
      {missing && (
        <p className="mb-1.5 text-xs text-amber-700 dark:text-amber-300">
          &ldquo;{value}&rdquo; is missing, so this hero stands as the neutral mini. Pick another.
        </p>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {HERO_MINIS.map((m) => {
          const neutral = m.id === NEUTRAL_MINI;
          const checked = current === m.id;
          return (
            <label
              key={m.id}
              title={neutral ? `Neutral (${m.name})` : m.name}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-xs has-focus-visible:ring-2 has-focus-visible:ring-amber-500/40 ${
                checked ? "border-amber-500 bg-amber-500/15" : "border-foreground/20 hover:bg-foreground/5"
              }`}
            >
              <input
                type="radio"
                name="mini"
                value={m.id}
                checked={checked}
                onChange={() => onChange(neutral ? "" : m.id)}
                className="sr-only"
              />
              <MiniPortrait mini={m} size={44} className={checked ? "ring-2 ring-amber-500" : ""} />
              <span className="w-full truncate text-center">{neutral ? "Neutral" : m.name}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
