"use client";

import { Glass } from "@/components/ui/Glass";
import { Button, IconButton } from "@/components/ui/Button";
import { useGame, useGameStore } from "./GameProvider";
import type { GameFiles } from "./useGameFiles";

/**
 * The first-visit banner at the top centre, shown while the example table is
 * untouched: **Start empty**, **Load game**, or dismiss it to keep playing
 * with the example. The first change to the table hides it too.
 */
export function ExampleBanner({ files }: { files: GameFiles }) {
  const { game } = useGame();
  const { store } = useGameStore();
  if (!game.example) return null;
  return (
    <Glass
      role="status"
      className="flex max-w-[min(42rem,calc(100vw-2rem))] flex-wrap items-center gap-x-3 gap-y-2 py-1.5 pr-1.5 pl-3.5 text-sm motion-safe:animate-hud-rise"
    >
      <span className="min-w-0 flex-1">This is an example table. Your own stays in this browser.</span>
      <div className="flex items-center gap-1.5">
        <Button tone="primary" className="h-8" onClick={() => files.startNew("empty")}>
          Start empty
        </Button>
        <Button icon="load" className="h-8" onClick={files.pick}>
          Load game
        </Button>
        <IconButton
          label="Keep the example"
          title="Keep playing with the example"
          icon="close"
          className="size-8 border-transparent bg-transparent"
          onClick={() => store.amend((g) => ({ ...g, example: false }))}
        />
      </div>
    </Glass>
  );
}
