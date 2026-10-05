"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import type { Pos } from "@/lib/types";
import {
  panBy,
  screenToWorld,
  viewBoxAttr,
  viewBoxOf,
  zoomAt,
  type Camera,
  type ViewBox,
  type ViewportSize,
} from "@/lib/map/camera";
import type { FigureFootprint } from "@/lib/map/terrain";
import { useCamera, type InitialCamera } from "./useCamera";
import { FELT_BASE, Lamp, TableDefs, TableGround, TablePieces } from "./Table";

/** Imperative API exposed through `ref`. Getters always return the latest values. */
export type MapHandle = {
  readonly camera: Camera;
  readonly viewportSize: ViewportSize;
  /** `screen` is relative to the canvas' top-left corner. */
  screenToWorld(screen: Pos): Pos;
  /** Converts `clientX`/`clientY` from a pointer event to world coordinates. */
  clientToWorld(clientX: number, clientY: number): Pos;
  /** The client point shows the map: inside the canvas and not under something drawn over it (a HUD surface). */
  isOnMap(clientX: number, clientY: number): boolean;
  /** Animates (about 300ms) to center `point` at a readable zoom. */
  flyTo(point: Pos): void;
  /** Zooms by `factor` around the middle of the screen, gliding like `flyTo`. */
  zoomBy(factor: number): void;
  /** Glides back to the opening view (`initialCamera`), worked out for the current viewport. */
  fitAll(): void;
  /** Animates to an exact camera (e.g. from `fitBounds`). */
  animateTo(camera: Camera): void;
  /** Jumps to a camera without animation. */
  setCamera(camera: Camera): void;
};

/** What render-function children and overlays receive. */
export type MapView = { camera: Camera; viewport: ViewportSize; viewBox: ViewBox };

type Layer = ReactNode | ((view: MapView) => ReactNode);

type Props = {
  /** The opening view: a camera, or a function computing one from the viewport size (e.g. `fitBounds`). `fitAll` returns to it. */
  initialCamera: InitialCamera;
  /** World-space SVG content. */
  children?: Layer;
  /** Screen-space HTML layer above the map. Its container has `pointer-events: none`; opt in per element. */
  overlay?: Layer;
  /** Where the figures and their labels stand, so raised terrain pieces never hide them. */
  footprints?: FigureFootprint[];
  /** Click (no drag) on empty ground; receives the world point. */
  onBackgroundClick?: (world: Pos) => void;
  /** React 19 ref-as-prop. */
  ref?: Ref<MapHandle>;
  className?: string;
};

const NO_FOOTPRINTS: FigureFootprint[] = [];

/** Pointer travel (screen px) below which a press on the ground counts as a click. */
const CLICK_SLOP = 4;
/** Zoom speed per wheel pixel for a mouse wheel / trackpad scroll, and for a pinch (ctrl+wheel). */
const WHEEL_SPEED = 0.0015;
const PINCH_SPEED = 0.01;

/**
 * Infinite SVG map with hand-rolled pan (drag empty ground) and zoom (wheel at
 * the cursor, trackpad pinch), drawn on the felt table (see Table.tsx). Elements
 * inside a `[data-figure]` ancestor never start a pan, so figures can handle
 * their own drags.
 */
export function MapCanvas({
  initialCamera,
  children,
  overlay,
  footprints = NO_FOOTPRINTS,
  onBackgroundClick,
  ref,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cam = useCamera(initialCamera);
  const { cameraRef, viewportRef, setCamera, setViewport, flyTo, zoomBy, fitAll, animateTo } = cam;
  const onBackgroundClickRef = useRef(onBackgroundClick);

  useEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick]);

  useImperativeHandle(
    ref,
    () => {
      const toWorld = (screen: Pos) => {
        const c = cameraRef.current;
        return c ? screenToWorld(c, screen) : screen;
      };
      return {
        get camera() {
          return cameraRef.current ?? { x: 0, y: 0, scale: 1 };
        },
        get viewportSize() {
          return viewportRef.current ?? { width: 0, height: 0 };
        },
        screenToWorld: toWorld,
        clientToWorld(clientX, clientY) {
          const r = svgRef.current?.getBoundingClientRect();
          return toWorld({ x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) });
        },
        isOnMap(clientX, clientY) {
          const top = document.elementFromPoint(clientX, clientY);
          return Boolean(top && containerRef.current?.contains(top));
        },
        flyTo,
        zoomBy,
        fitAll,
        animateTo,
        setCamera: (c: Camera) => setCamera(c),
      };
    },
    [cameraRef, viewportRef, flyTo, zoomBy, fitAll, animateTo, setCamera],
  );

  // Track the canvas size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setViewport({ width: Math.round(r.width), height: Math.round(r.height) });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setViewport]);

  // Wheel / pinch zoom. Registered natively so it can be non-passive and call preventDefault.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const local = (clientX: number, clientY: number): Pos => {
      const r = svg.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16;
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= svg.clientHeight || 800;
      // Trackpad pinch arrives as a wheel event with ctrlKey set (Chrome, Firefox, Edge).
      const speed = e.ctrlKey ? PINCH_SPEED : WHEEL_SPEED;
      const factor = Math.exp(-Math.max(-100, Math.min(100, dy)) * speed);
      const point = local(e.clientX, e.clientY);
      setCamera((c) => zoomAt(c, point, factor));
    };

    // Safari reports pinch as non-standard gesture events instead.
    type GestureEvt = UIEvent & { scale: number; clientX: number; clientY: number };
    let lastScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      lastScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvt;
      const factor = g.scale / lastScale;
      lastScale = g.scale;
      const point = local(g.clientX, g.clientY);
      setCamera((c) => zoomAt(c, point, factor));
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("gesturestart", onGestureStart);
    svg.addEventListener("gesturechange", onGestureChange);
    return () => {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("gesturestart", onGestureStart);
      svg.removeEventListener("gesturechange", onGestureChange);
    };
  }, [setCamera]);

  // Panning: pointer capture on empty ground.
  const drag = useRef<{
    id: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const [panning, setPanning] = useState(false);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    if ((e.target as Element).closest("[data-figure]")) return;
    if (drag.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < CLICK_SLOP) return;
    if (!d.moved) {
      d.moved = true;
      setPanning(true);
    }
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    setCamera((c) => panBy(c, dx, dy));
  };

  const endDrag = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const c = cameraRef.current;
    if (!cancelled && !d.moved && e.button === 0 && c && onBackgroundClickRef.current) {
      const r = e.currentTarget.getBoundingClientRect();
      onBackgroundClickRef.current(
        screenToWorld(c, { x: e.clientX - r.left, y: e.clientY - r.top }),
      );
    }
  };

  const { camera, viewport } = cam;
  const view: MapView | null =
    camera && viewport ? { camera, viewport, viewBox: viewBoxOf(camera, viewport) } : null;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full flex-1 overflow-hidden ${className ?? ""}`}
      style={{ background: FELT_BASE }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 block h-full w-full select-none"
        style={{ touchAction: "none", cursor: panning ? "grabbing" : "grab" }}
        viewBox={view ? viewBoxAttr(view.viewBox) : undefined}
        preserveAspectRatio="xMinYMin meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        onLostPointerCapture={(e) => endDrag(e, true)}
      >
        <TableDefs />
        {view && (
          <>
            <TableGround viewBox={view.viewBox} scale={view.camera.scale} />
            <TablePieces viewBox={view.viewBox} footprints={footprints} front={false} />
            <g>{typeof children === "function" ? children(view) : children}</g>
            <TablePieces viewBox={view.viewBox} footprints={footprints} front />
          </>
        )}
      </svg>
      <Lamp />
      {view && overlay && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {typeof overlay === "function" ? overlay(view) : overlay}
        </div>
      )}
    </div>
  );
}
