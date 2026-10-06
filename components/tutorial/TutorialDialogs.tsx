"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { EMPTY_WORLD, newGame } from "@/lib/save/game";
import { heroMini, monsterMini, type Mini } from "@/lib/map/minis";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Portrait } from "@/components/ui/Portrait";
import { useToast } from "@/components/ui/Toast";
import { useGame, useGameStore, useTutorial } from "@/components/game/GameProvider";
import { Actions, UnsavedWarning } from "@/components/game/GameDialogs";
import type { GameFiles } from "@/components/game/useGameFiles";
import { tutorialStage } from "./stage";

/** The mini shown for heroes on the welcome dialog. */
const WELCOME_HERO = "hooded-rogue";

/** Skipping the tutorial, from the welcome dialog or the coach card: the table stays as it is. */
export function useSkipTutorial(): () => void {
  const { tutorial } = useGameStore();
  const toast = useToast();
  return useCallback(() => {
    tutorial.set("skipped");
    toast.show({ tone: "done", message: "Tutorial skipped. Play it any time from the game menu." });
  }, [tutorial, toast]);
}

/**
 * The tutorial's two dialogs: the welcome, which must be answered with Start
 * or Skip, and the victory, which opens the moment a monster a hero fought is
 * slain while the tutorial runs. That moment stores "done", so Undo or Revive
 * afterwards never reopens the tutorial.
 */
export function TutorialDialogs({ files }: { files: GameFiles }) {
  const { game } = useGame();
  const tutorial = useTutorial();
  const { tutorial: tutorialStore } = useGameStore();
  const stage = useMemo(() => tutorialStage(game.world), [game.world]);
  const [trophy, setTrophy] = useState<string | null>(null);

  const won = tutorial.status === "playing" && stage.step === "victory" ? stage.monster.name : null;
  // Opened while rendering the win; the stored "done" that follows ends `won`, and the dialog stays.
  if (won !== null && trophy !== won) setTrophy(won);
  useEffect(() => {
    if (won !== null) tutorialStore.set("done");
  }, [won, tutorialStore]);

  return (
    <>
      <WelcomeDialog open={tutorial.welcome} files={files} />
      <VictoryDialog trophy={trophy} files={files} onClose={() => setTrophy(null)} />
    </>
  );
}

/**
 * Welcome to Initiative: what the game is, in four tiles, then **Start the
 * tutorial** on an empty table or **Skip the tutorial**. It has no close
 * button and ignores Esc, so the choice is never made by accident. Opened
 * again from the game menu, it warns that starting clears a table with
 * changes no save file holds.
 */
function WelcomeDialog({ open, files }: { open: boolean; files: GameFiles }) {
  const { game } = useGame();
  const { store, tutorial } = useGameStore();
  const skip = useSkipTutorial();
  const start = () => {
    store.replace(newGame(EMPTY_WORLD, false));
    tutorial.set("playing");
  };

  return (
    <Dialog open={open} title="Welcome to Initiative" className="max-w-xl">
      <p className="text-[15px] leading-relaxed">
        Your work becomes monsters and your team becomes heroes, laid out on a tabletop map. One look tells you who
        fights what, and which monsters nobody is fighting.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
        <Tile mini={monsterMini({ size: "M" })} title="Monsters">
          Anything to deal with: an initiative, an incident, a hire.
        </Tile>
        <Tile mini={heroMini(WELCOME_HERO)} title="Heroes">
          The people on your team, and you.
        </Tile>
        <Tile mini={monsterMini({ size: "S" })} ring="red" title="Unfought" danger>
          A monster nobody fights pulses red.
        </Tile>
        <Tile icon title="Trophies">
          Slay a monster when the work is done.
        </Tile>
      </ul>
      <p className="mt-4 text-sm text-hud-muted">
        Learn the four moves in about a minute: summon a monster, recruit a hero, send the hero into battle and slay
        the monster. The tutorial starts on an empty table, which stays in this browser.
      </p>
      {game.unsavedSince && <UnsavedWarning>Starting the tutorial clears the table.</UnsavedWarning>}
      <Actions>
        {game.unsavedSince && (
          <Button icon="save" onClick={files.save}>
            Save current first
          </Button>
        )}
        <Button onClick={skip}>Skip the tutorial</Button>
        <Button tone="primary" autoFocus onClick={start}>
          Start the tutorial
        </Button>
      </Actions>
    </Dialog>
  );
}

function Tile({
  mini,
  ring,
  icon = false,
  danger = false,
  title,
  children,
}: {
  mini?: Mini;
  ring?: "red";
  /** A trophy icon in place of a mini. */
  icon?: boolean;
  danger?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-[10px] border border-hud-gold/20 bg-white/5 p-2.5">
      {mini ? (
        <Portrait mini={mini} size={52} ring={ring} />
      ) : (
        icon && (
          <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-[#4d6a3a] text-hud-gold">
            <Icon.trophy className="size-6" />
          </span>
        )
      )}
      <span className="grid gap-0.5">
        <b
          className={`font-display text-[13px] tracking-[0.08em] uppercase ${danger ? "text-[#ff9a9d]" : "text-hud-gold"}`}
        >
          {title}
        </b>
        <span className="text-[13px] leading-snug text-hud-muted">{children}</span>
      </span>
    </li>
  );
}

const LEARNED = [
  "Summon monsters for the work in front of you",
  "Recruit heroes for the people who fight them",
  "Drag a hero onto a monster to assign them",
  "Slay a monster when it is done",
];

/**
 * Victory: the tutorial is done. **Keep this table** (also the close button
 * and Esc), **Start empty** or **Open the example table**.
 */
function VictoryDialog({ trophy, files, onClose }: { trophy: string | null; files: GameFiles; onClose: () => void }) {
  const leave = (table: "empty" | "example") => {
    files.startNew(table);
    onClose();
  };
  return (
    <Dialog open={trophy !== null} title="Victory!" onClose={onClose} className="max-w-lg">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="flex size-18 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3d995,#b8892f_70%)] text-[#2a1d06] shadow-[0_0_0_6px_rgba(217,180,95,0.18),0_0_40px_rgba(217,180,95,0.55)]">
          <Icon.trophy className="size-9" />
        </span>
        <p className="text-[15px] leading-relaxed">
          <b>{trophy}</b> is slain and hangs in the trophy hall. You know the whole game now.
        </p>
      </div>
      <ul className="mt-4 grid gap-2 rounded-[10px] border border-hud-gold/20 bg-white/5 px-3.5 py-3 text-sm">
        {LEARNED.map((line) => (
          <li key={line} className="flex items-center gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-hud-gold/50 bg-hud-gold/15 text-hud-gold">
              <Icon.check className="size-3" strokeWidth={3} />
            </span>
            {line}
          </li>
        ))}
      </ul>
      <Actions>
        <Button onClick={() => leave("example")}>Open the example table</Button>
        <Button onClick={() => leave("empty")}>Start empty</Button>
        <Button tone="primary" onClick={onClose}>
          Keep this table
        </Button>
      </Actions>
      <p className="mt-3 text-center text-xs text-hud-muted">
        Play the tutorial again any time from the game menu under the wordmark.
      </p>
    </Dialog>
  );
}
