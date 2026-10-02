"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Pos } from "@/lib/types";
import {
  flyTarget,
  lerpCamera,
  type Camera,
  type ViewportSize,
} from "@/lib/map/camera";

const FLY_MS = 300;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** An initial camera, or a function that computes one from the first measured viewport. */
export type InitialCamera = Camera | ((viewport: ViewportSize) => Camera);

/**
 * Camera + viewport state for the map canvas.
 *
 * `cameraRef` / `viewportRef` always hold the latest values, so event handlers
 * that fire several times between renders (wheel, pointermove) stay consistent.
 * `viewport` is `null` until the canvas has been measured.
 */
export function useCamera(initial: InitialCamera) {
  const initialRef = useRef(initial);
  const [camera, setCameraState] = useState<Camera | null>(
    typeof initial === "function" ? null : initial,
  );
  const [viewport, setViewportState] = useState<ViewportSize | null>(null);
  const cameraRef = useRef<Camera | null>(camera);
  const viewportRef = useRef<ViewportSize | null>(null);
  const animRef = useRef<number | null>(null);

  const stopAnimation = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const commit = useCallback((next: Camera) => {
    cameraRef.current = next;
    setCameraState(next);
  }, []);

  /** Sets the camera immediately, cancelling any running fly animation. */
  const setCamera = useCallback(
    (next: Camera | ((prev: Camera) => Camera)) => {
      stopAnimation();
      const prev = cameraRef.current;
      if (!prev && typeof next === "function") return;
      commit(typeof next === "function" ? next(prev!) : next);
    },
    [commit, stopAnimation],
  );

  /** Called by the canvas whenever its size is measured. */
  const setViewport = useCallback(
    (size: ViewportSize) => {
      const prev = viewportRef.current;
      if (prev && prev.width === size.width && prev.height === size.height) return;
      viewportRef.current = size;
      setViewportState(size);
      if (!cameraRef.current) {
        const init = initialRef.current;
        commit(typeof init === "function" ? init(size) : init);
      }
    },
    [commit],
  );

  /** Animates (about 300ms, eased) to `target`; instant under prefers-reduced-motion. */
  const animateTo = useCallback(
    (target: Camera) => {
      stopAnimation();
      const from = cameraRef.current;
      if (!from || prefersReducedMotion()) {
        commit(target);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / FLY_MS);
        commit(t >= 1 ? target : lerpCamera(from, target, easeInOutCubic(t)));
        animRef.current = t >= 1 ? null : requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    },
    [commit, stopAnimation],
  );

  /** Centers on a world point at a readable zoom (see `flyTarget`). */
  const flyTo = useCallback(
    (point: Pos) => {
      const cam = cameraRef.current;
      const vp = viewportRef.current;
      if (!cam || !vp) return;
      animateTo(flyTarget(cam, point, vp));
    },
    [animateTo],
  );

  useEffect(() => stopAnimation, [stopAnimation]);

  return {
    camera,
    viewport,
    cameraRef,
    viewportRef,
    setCamera,
    setViewport,
    animateTo,
    flyTo,
  };
}
