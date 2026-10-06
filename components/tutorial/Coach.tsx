"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Glass } from "@/components/ui/Glass";
import { IconButton } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/icons";
import { COACHED_STEPS, type TutorialStage } from "./stage";

/** A stage the coach card talks the player through: every one but victory. */
export type CoachedStage = Exclude<TutorialStage, { step: "victory" }>;

/**
 * The tutorial's coach card: the step ("Step 2 of 4"), what it is about, what
 * to do, progress pips and **Skip tutorial**. The board places it beside the
 * control it points at, which glows. While a monster or hero dialog is open
 * it folds into a slim bar at the top, over the dim, and the dialog opens
 * below it; on a phone it is a bottom sheet, lifted clear of the trophy shelf
 * while it is about slaying, that folds into the bar under the top clusters
 * while the figure card is docked as the bottom sheet, or by hand. Wherever
 * the bar shows, its bottom edge is published as `--coach-bar`.
 */
export function Coach({
  stage,
  dialogOpen,
  cardDocked,
  onSkip,
}: {
  stage: CoachedStage;
  /** A monster or hero dialog is open. */
  dialogOpen: boolean;
  /** The figure card is docked as a bottom sheet (on a phone). */
  cardDocked: boolean;
  onSkip: () => void;
}) {
  const [folded, setFolded] = useState(false);
  const asBar = dialogOpen || cardDocked || folded;
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = bar.current;
    if (!asBar || !el) return;
    // Dialogs open below the bar, and the docked figure card keeps its figure below it.
    const root = document.documentElement.style;
    const ro = new ResizeObserver(() => root.setProperty("--coach-bar", `${el.getBoundingClientRect().bottom}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.removeProperty("--coach-bar");
    };
  }, [asBar, dialogOpen]);
  const copy = coachCopy(stage);
  const number = COACHED_STEPS.indexOf(stage.step) + 1;
  const eyebrow = (
    <span className="text-[11px] font-semibold tracking-[0.16em] whitespace-nowrap text-hud-gold uppercase">
      Step {number} of {COACHED_STEPS.length}
    </span>
  );
  const pips = <Pips done={number} />;
  const skip = (
    <button
      type="button"
      onClick={onSkip}
      className="cursor-pointer rounded px-1 py-2 text-[13px] whitespace-nowrap text-hud-muted underline underline-offset-3 hover:text-hud-fg"
    >
      Skip tutorial
    </button>
  );

  if (asBar) {
    return createPortal(
      <div
        ref={bar}
        className={`pointer-events-none fixed inset-x-0 flex justify-center px-4 ${
          dialogOpen ? "top-4 z-60" : "top-4 z-30 compact:top-16 max-sm:top-26!"
        }`}
      >
        <Glass
          role="region"
          aria-label="Tutorial"
          className="pointer-events-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-1 py-1.5 pr-1.5 pl-4 text-sm motion-safe:animate-hud-rise"
        >
          {eyebrow}
          <span className="min-w-40 flex-1">{copy.short}</span>
          <span className="max-sm:hidden">{pips}</span>
          {skip}
          {!dialogOpen && !cardDocked && (
            <IconButton
              label="Open the tutorial card"
              icon="chevronDown"
              className="size-8 rotate-180 border-transparent bg-transparent"
              onClick={() => setFolded(false)}
            />
          )}
        </Glass>
      </div>,
      document.body,
    );
  }

  const IconSvg = Icon[copy.icon];
  return (
    <Glass
      role="region"
      aria-label="Tutorial"
      className={`grid w-[22rem] gap-2.5 px-4.5 pt-4 pb-1.5 motion-safe:animate-hud-rise compact:fixed compact:inset-x-3 compact:z-10 compact:w-auto ${
        stage.step === "slay" ? "compact:bottom-28" : "compact:bottom-3"
      }`}
    >
      <div className="flex items-center justify-between">
        {eyebrow}
        <span className="hidden compact:block">{pips}</span>
      </div>
      <h2 className="font-display text-lg leading-tight tracking-[0.04em] text-hud-fg">{copy.title}</h2>
      <div className="grid gap-2 text-sm leading-normal compact:hidden">{copy.about}</div>
      <p className="flex items-start gap-2.5 rounded-[10px] border border-hud-gold/30 bg-hud-gold/10 px-3 py-2.5 text-sm leading-snug">
        <IconSvg className="mt-px size-4.5 shrink-0 text-hud-gold" />
        <span>{copy.todo}</span>
      </p>
      <div className="flex items-center justify-between">
        <span className="compact:hidden">{pips}</span>
        {skip}
        <span className="hidden compact:block">
          <IconButton
            label="Fold the tutorial card"
            icon="chevronDown"
            className="size-11 border-transparent bg-transparent"
            onClick={() => setFolded(true)}
          />
        </span>
      </div>
    </Glass>
  );
}

/** One bar per coached step, gold up to the current one. */
function Pips({ done }: { done: number }) {
  return (
    <span className="flex gap-1.5" aria-hidden="true">
      {COACHED_STEPS.map((step, i) => (
        <span key={step} className={`h-1 w-5.5 rounded-sm ${i < done ? "bg-hud-gold" : "bg-white/20"}`} />
      ))}
    </span>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-white/35 px-1.5 font-sans text-xs leading-[18px] font-semibold">
      {children}
    </kbd>
  );
}

/** Keyboard help, left out on a touch screen. */
function KeyHint({ children }: { children: ReactNode }) {
  return <span className="pointer-coarse:hidden">{children}</span>;
}

type CoachCopy = {
  title: ReactNode;
  /** What the step is about; left out on a phone. */
  about: ReactNode;
  /** What to do, in the gold box. */
  todo: ReactNode;
  icon: IconName;
  /** What to do, in a few words, for the slim bar. */
  short: ReactNode;
};

function coachCopy(stage: CoachedStage): CoachCopy {
  switch (stage.step) {
    case "monster":
      return {
        title: "Summon a monster",
        about: (
          <p>
            A monster is anything you have to deal with: an initiative, an incident, tech debt, a hire. Its size, from
            small to extra large, shows how big it is, and you pick the creature that stands for it.
          </p>
        ),
        todo: (
          <>
            Click <b>+ Monster</b>
            <KeyHint>
              {" "}
              (or press <Key>N</Key>)
            </KeyHint>
            , give it a name and press <b>Summon</b>.
          </>
        ),
        icon: "plus",
        short: (
          <>
            Name your monster, pick a size, then press <b>Summon</b>.
          </>
        ),
      };
    case "hero":
      return {
        title: "Recruit a hero",
        about: (
          <>
            <p>
              <b>{stage.monster.name}</b> is on the table. It pulses red because nobody is fighting it yet, and the
              list under the wordmark counts every unfought monster.
            </p>
            <p>Heroes are the people on your team, or you.</p>
          </>
        ),
        todo: (
          <>
            Click <b>+ Hero</b>
            <KeyHint>
              {" "}
              (or press <Key>H</Key>)
            </KeyHint>
            , pick a mini, give them a name and class and press{" "}
            <b>Recruit</b>.
          </>
        ),
        icon: "plus",
        short: (
          <>
            Pick a mini, give them a name and class, then press <b>Recruit</b>.
          </>
        ),
      };
    case "assign":
      return {
        title: <>Send {stage.hero.name} into battle</>,
        about: (
          <p>
            A hero stands idle until you give them a target. The target pulls the hero to its side and draws a gold
            arrow between them.
          </p>
        ),
        todo: (
          <>
            Drag <b>{stage.hero.name}</b> onto <b>{stage.monster.name}</b> and let go.
            <KeyHint>
              {" "}
              Hold <Key>Shift</Key> while dropping to add a second target instead.
            </KeyHint>
          </>
        ),
        icon: "swords",
        short: (
          <>
            Drag <b>{stage.hero.name}</b> onto <b>{stage.monster.name}</b>.
          </>
        ),
      };
    case "slay":
      return {
        title: "Slay the monster",
        about: (
          <p>
            {stage.hero.name} is fighting <b>{stage.monster.name}</b>, so it stopped pulsing red. When the work is
            done, slay the monster and it becomes a trophy.
          </p>
        ),
        todo: (
          <>
            Drag <b>{stage.monster.name}</b> onto the trophy shelf, or click it and press <b>Slay</b> on its card.
          </>
        ),
        icon: "trophy",
        short: (
          <>
            Drag <b>{stage.monster.name}</b> onto the trophy shelf, or press <b>Slay</b> on its card.
          </>
        ),
      };
  }
}
