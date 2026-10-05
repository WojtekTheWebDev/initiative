"use client";

import type { ReactNode } from "react";
import type { World } from "@/lib/types";
import { tableCounts } from "@/lib/save/file";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useGame } from "./GameProvider";
import type { GameFiles } from "./useGameFiles";

/** Problems listed in the load dialog before the rest fold into "and N more". */
const MAX_PROBLEMS = 5;

/** The load dialog and the new game dialog, whichever `files` has open. */
export function GameDialogs({ files }: { files: GameFiles }) {
  return (
    <>
      <LoadDialog files={files} />
      <NewGameDialog files={files} />
    </>
  );
}

/**
 * Load a game: what is on the table now beside what is in the file, a warning
 * when the table has changes no file holds, and **Replace table**. A file that
 * can't be read says why and offers to choose another.
 */
function LoadDialog({ files }: { files: GameFiles }) {
  const { game } = useGame();
  const { pending } = files;
  if (!pending) return null;

  if ("error" in pending) {
    return (
      <Dialog open title="Load a game" onClose={files.cancelLoad}>
        <Callout tone="danger">
          <b className="font-semibold">{pending.name} can&apos;t be loaded.</b> {pending.error}. Choose a file written
          by Save game.
        </Callout>
        <Actions>
          <Button tone="primary" onClick={files.pick}>
            Choose another file
          </Button>
        </Actions>
      </Dialog>
    );
  }

  const { save } = pending;
  const { problems } = save;
  return (
    <Dialog open title="Load a game" onClose={files.cancelLoad}>
      <div className="grid grid-cols-2 gap-3">
        <Side label="On your table now" world={game.world} />
        <Side label="In the file" world={save.world} file={pending.name} savedAt={save.savedAt} />
      </div>
      {problems.length > 0 && (
        <Callout tone="warn">
          <b className="font-semibold">
            {problems.length === 1 ? "The file has a problem" : `The file has ${problems.length} problems`}.
          </b>{" "}
          It still loads, but some figures may look wrong:
          <ul className="mt-1 list-disc pl-4">
            {problems.slice(0, MAX_PROBLEMS).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {problems.length > MAX_PROBLEMS && <li>and {problems.length - MAX_PROBLEMS} more</li>}
          </ul>
        </Callout>
      )}
      {game.unsavedSince && <UnsavedWarning>Loading this file replaces them.</UnsavedWarning>}
      <Actions>
        {game.unsavedSince && (
          <Button icon="save" onClick={files.save}>
            Save current first
          </Button>
        )}
        <Button tone="primary" onClick={() => files.replace(pending)}>
          Replace table
        </Button>
      </Actions>
    </Dialog>
  );
}

/** New game: clears the table for an empty one or the example, after offering a save. */
function NewGameDialog({ files }: { files: GameFiles }) {
  const { game } = useGame();
  if (!files.newGameOpen) return null;
  return (
    <Dialog open title="New game" onClose={files.closeNewGame}>
      <p className="text-sm text-hud-muted">
        A new game clears the table: every monster, hero and trophy. Start with an empty table, or with the example to
        try things out.
      </p>
      {game.unsavedSince && <UnsavedWarning>A new game throws them away.</UnsavedWarning>}
      <Actions>
        {game.unsavedSince && (
          <Button icon="save" onClick={files.save}>
            Save current first
          </Button>
        )}
        <Button onClick={() => files.startNew("example")}>Example table</Button>
        <Button tone="primary" onClick={() => files.startNew("empty")}>
          Empty table
        </Button>
      </Actions>
    </Dialog>
  );
}

function Side({ label, world, file, savedAt }: { label: string; world: World; file?: string; savedAt?: string }) {
  const counts = tableCounts(world);
  const rows: [number, string, string][] = [
    [counts.monsters, "monster", "monsters"],
    [counts.heroes, "hero", "heroes"],
    [counts.trophies, "trophy", "trophies"],
  ];
  return (
    <div
      className={`grid min-w-0 content-start gap-1 rounded-[10px] border p-3 ${
        file ? "border-hud-line bg-hud-gold/5" : "border-white/10"
      }`}
    >
      <span className="text-[11px] font-semibold tracking-wide text-hud-muted uppercase">{label}</span>
      {file && <span className="font-mono text-xs break-all">{file}</span>}
      <ul className="text-sm tabular-nums">
        {rows.map(([n, one, many]) => (
          <li key={many}>
            <b className="inline-block min-w-6 font-semibold text-hud-gold">{n}</b> {n === 1 ? one : many}
          </li>
        ))}
      </ul>
      {savedAt && <span className="text-xs text-hud-muted">Saved {formatDate(savedAt)}</span>}
    </div>
  );
}

function UnsavedWarning({ children }: { children: ReactNode }) {
  return (
    <Callout tone="warn">
      Your table has changes that aren&apos;t in a save file. {children} Save the current game first if you may want it
      back.
    </Callout>
  );
}

function Callout({ tone, children }: { tone: "warn" | "danger"; children: ReactNode }) {
  const warn = tone === "warn";
  return (
    <div
      role={warn ? undefined : "alert"}
      className={`mt-4 flex gap-2.5 rounded-[10px] border px-3 py-2.5 text-sm ${
        warn ? "border-hud-warn/35 bg-hud-warn/10" : "border-hud-danger/50 bg-hud-danger/10"
      }`}
    >
      {warn ? (
        <Icon.warn className="mt-0.5 size-4 shrink-0 text-hud-warn" />
      ) : (
        <Icon.close className="mt-0.5 size-4 shrink-0 text-[#ff9a9d]" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A dialog's buttons, at its bottom right; in a narrow window they stack full width. */
function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap justify-end gap-2 max-sm:flex-col">{children}</div>;
}

/** "20 Sep 2026", in the local time zone. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
