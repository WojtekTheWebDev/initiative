import type { ReactNode } from "react";

/** Space between a HUD cluster and the window edge. */
const EDGE = "16px";

/**
 * The HUD layer over the full-window table: one floating cluster per corner
 * slot. The layer itself lets every pointer through to the table; only the
 * clusters' own children take pointer events. It sits outside the map's
 * container, so a figure dropped on a cluster isn't dropped on the map.
 */
export function Hud({
  top,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}: {
  /** The first-visit banner, centred along the top edge; on a phone, across the window under the top clusters. */
  top?: ReactNode;
  /** The wordmark and its game menu, with the muster tokens hanging below it. */
  topLeft?: ReactNode;
  /** The create buttons, with the party roster hanging below them. */
  topRight?: ReactNode;
  /** The trophy shelf. */
  bottomLeft?: ReactNode;
  /** The map controls. */
  bottomRight?: ReactNode;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30" style={{ padding: EDGE }}>
      <div className="relative h-full w-full">
        {top && <Slot className="top-0 left-1/2 -translate-x-1/2 justify-center compact:top-16 max-sm:top-26! compact:right-0 compact:left-0 compact:translate-x-0">{top}</Slot>}
        {topLeft && <Slot className="top-0 left-0 flex-col items-start">{topLeft}</Slot>}
        {topRight && <Slot className="top-0 right-0 flex-col items-end">{topRight}</Slot>}
        {bottomLeft && <Slot className="bottom-0 left-0 items-end">{bottomLeft}</Slot>}
        {bottomRight && <Slot className="right-0 bottom-0 flex-col items-end">{bottomRight}</Slot>}
      </div>
    </div>
  );
}

function Slot({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`absolute flex gap-3 *:pointer-events-auto ${className}`}>{children}</div>;
}
