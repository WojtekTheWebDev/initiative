"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Pos } from "@/lib/types";
import { worldToScreen, type Camera } from "@/lib/map/camera";
import { linksOf } from "@/lib/map/links";
import type { FigureDrag } from "./useFigureDrag";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/icons";

/** The buttons for the arrow the user clicked (`drag.link`), placed at the arrow's midpoint. */
export function OpenTargetButtons({ drag, camera }: { drag: FigureDrag; camera: Camera }) {
  const ref = drag.link;
  if (!ref) return null;
  const placed = linksOf(drag.layout).find((l) => l.heroId === ref.heroId && l.monsterId === ref.monsterId);
  const hero = drag.layout.heroes.find((h) => h.hero.id === ref.heroId)?.hero;
  const monster = drag.layout.monsters.find((m) => m.monster.id === ref.monsterId)?.monster;
  if (!placed || !hero || !monster) return null;
  const mid = { x: (placed.from.x + placed.to.x) / 2, y: (placed.from.y + placed.to.y) / 2 };
  return (
    <TargetButtons
      key={`${ref.heroId}:${ref.monsterId}`}
      anchor={worldToScreen(camera, mid)}
      heroName={hero.name}
      monsterName={monster.name}
      main={placed.main}
      onMakeMain={() => drag.makeMain(ref)}
      onRemove={() => drag.removeTarget(ref)}
      onClose={drag.closeLink}
    />
  );
}

type Props = {
  /** Screen point (relative to the canvas) of the arrow's midpoint. */
  anchor: Pos;
  heroName: string;
  monsterName: string;
  /** The arrow points at the hero's main target, so there is nothing to make main. */
  main: boolean;
  onMakeMain: () => void;
  onRemove: () => void;
  onClose: () => void;
};

/**
 * Two round glass buttons centred on a target arrow's midpoint, with a label
 * above naming the pair: a gold crown, Make main (only on a secondary arrow),
 * and red shears, Remove target. Lives in the canvas' screen-space overlay.
 * The first button takes focus when they open and Tab cycles between them.
 * Closes on Esc or a press outside them.
 */
export function TargetButtons({ anchor, heroName, monsterName, main, onMakeMain, onRemove, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // tells the side panel this Esc is taken
        onCloseRef.current();
      }
    };
    // Capture phase, so a press that starts a pan or drag still closes them.
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !ref.current) return;
    const buttons = [...ref.current.querySelectorAll("button")];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    e.preventDefault();
    buttons[(at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
  };

  const pair = `${heroName} → ${monsterName}`;
  return (
    <div
      ref={ref}
      role="group"
      aria-label={pair}
      data-target-buttons=""
      className="pointer-events-auto absolute z-10 flex -translate-x-1/2 -translate-y-1/2 gap-2 motion-safe:animate-hud-pop"
      style={{ left: anchor.x, top: anchor.y }}
      onKeyDown={onKeyDown}
    >
      <Glass
        aria-hidden="true"
        className="absolute bottom-full left-1/2 mb-2 w-max max-w-64 -translate-x-1/2 truncate rounded-full! px-2.5 py-0.5 text-xs font-medium"
      >
        {pair}
      </Glass>
      {!main && (
        <RoundButton
          label="Make main"
          icon="crown"
          className="border-hud-gold/70! text-hud-gold hover:bg-hud-gold/20!"
          autoFocus
          onClick={onMakeMain}
        />
      )}
      <RoundButton
        label="Remove target"
        icon="shears"
        className="border-hud-danger/70! text-[#ff9a9d] hover:bg-hud-danger/20!"
        autoFocus={main}
        onClick={onRemove}
      />
    </div>
  );
}

function RoundButton({
  label,
  icon,
  className,
  autoFocus,
  onClick,
}: {
  label: string;
  icon: IconName;
  className: string;
  autoFocus: boolean;
  onClick: () => void;
}) {
  const IconSvg = Icon[icon];
  return (
    <Glass
      as="button"
      type="button"
      aria-label={label}
      title={label}
      autoFocus={autoFocus}
      className={`inline-flex size-10 cursor-pointer items-center justify-center rounded-full! shadow-lg shadow-black/40 motion-safe:transition-colors ${className}`}
      onClick={onClick}
    >
      <IconSvg className="size-5" />
    </Glass>
  );
}
