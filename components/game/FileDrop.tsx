"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

/**
 * Lets a save file be dropped anywhere on the window. While a file is dragged
 * over it, the table dims inside a gold frame saying "Drop to load"; the
 * dropped file goes to `onFile`, which opens the load dialog.
 */
export function FileDrop({ onFile }: { onFile: (file: File) => void }) {
  const [over, setOver] = useState(false);

  useEffect(() => {
    // dragenter and dragleave fire for every element crossed, so count them.
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setOver(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // allows the drop
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // keeps the browser from opening the file
      depth = 0;
      setOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) onFile(file);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [onFile]);

  if (!over) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 bg-black/55 p-4 motion-safe:animate-hud-fade">
      <div className="grid h-full place-items-center rounded-[18px] border-2 border-dashed border-hud-gold bg-hud-gold/5">
        <div className="grid justify-items-center gap-3 text-hud-gold">
          <Icon.file className="size-14" />
          <span className="font-display text-xl tracking-[0.12em] uppercase">Drop to load</span>
          <span className="text-sm text-hud-fg">The game in the file replaces your table after you confirm.</span>
        </div>
      </div>
    </div>
  );
}
