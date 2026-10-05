"use client";

import { Dialog } from "@/components/ui/Dialog";

const AUTHOR_URL = "https://www.wojciechsikora.dev/";

/** What the game is for and how it plays, with a link to its author's website. */
export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog title="About Initiative" open={open} onClose={onClose} className="max-w-md">
      <div className="grid gap-3 text-sm text-hud-muted">
        <p>
          <b className="font-semibold text-hud-fg">Initiative</b> is a planning playing game: your work and your team
          laid out as a tabletop battle, so you can see at a glance <i>who fights what</i>.
        </p>
        <ul className="grid gap-1.5 pl-4 [&>li]:list-disc">
          <li>
            <b className="font-semibold text-hud-fg">Monsters</b> are the things to deal with: an initiative, an
            incident, tech debt, a hire. The bigger the work, the bigger the beast.
          </li>
          <li>
            <b className="font-semibold text-hud-fg">Heroes</b> are the people. Drop a hero on a monster to send them
            into the fight; a hero can take on several, one of them main.
          </li>
          <li>
            A monster nobody fights is <b className="font-semibold text-[#ff9a9d]">unfought</b> and pulses red. Those
            are the ones to look at first.
          </li>
          <li>
            When the work is done, <b className="font-semibold text-hud-fg">slay</b> the monster. It leaves the map and
            becomes a trophy.
          </li>
        </ul>
        <p>
          Everything stays in this browser. Nothing about your table reaches a server, so save it to a file now and
          then.
        </p>
      </div>
      <p className="mt-5 border-t border-hud-line pt-4 text-sm text-hud-muted">
        Made by{" "}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-hud-gold underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Wojciech Sikora
        </a>
      </p>
    </Dialog>
  );
}
