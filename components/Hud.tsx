import type { ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/icons";

/** Space between a HUD cluster and the window edge. */
const EDGE = "16px";

/**
 * The HUD layer over the full-window table: one floating cluster per corner
 * slot. The layer itself lets every pointer through to the table; only the
 * clusters' own children take pointer events. It sits outside the map's
 * container, so a figure dropped on a cluster isn't dropped on the map.
 */
export function Hud({
  topLeft,
  topRight,
  bottomCenter,
  bottomRight,
}: {
  /** The wordmark, with the muster tokens hanging below it. */
  topLeft?: ReactNode;
  /** The create buttons. */
  topRight?: ReactNode;
  /** The trophy shelf. */
  bottomCenter?: ReactNode;
  /** The map controls. */
  bottomRight?: ReactNode;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30" style={{ padding: EDGE }}>
      <div className="relative h-full w-full">
        {topLeft && <Slot className="top-0 left-0 flex-col items-start">{topLeft}</Slot>}
        {topRight && <Slot className="top-0 right-0 items-start justify-end">{topRight}</Slot>}
        {bottomCenter && (
          <Slot className="bottom-0 left-1/2 max-w-[calc(100%-8rem)] -translate-x-1/2 justify-center">
            {bottomCenter}
          </Slot>
        )}
        {bottomRight && <Slot className="right-0 bottom-0 flex-col items-end">{bottomRight}</Slot>}
      </div>
    </div>
  );
}

function Slot({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`absolute flex gap-3 *:pointer-events-auto ${className}`}>{children}</div>;
}

/** The game's name in the top-left corner: crossed swords and "Initiative" in gold Cinzel capitals. */
export function Wordmark() {
  return (
    <Glass className="flex items-center gap-2.5 px-3.5 py-2 text-hud-gold">
      <Icon.swords className="size-5" />
      <h1 className="font-display text-base leading-none tracking-[0.14em] uppercase">Initiative</h1>
    </Glass>
  );
}
