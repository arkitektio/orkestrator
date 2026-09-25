import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { computeWorldUnitsPerPixel } from "../probe/probeWorld";
import { useViewerStore, useViewerStoreApi } from "../stores/viewerStore";

/** Max cadence (ms) at which worldUnitsPerPixel is published DURING motion;
 * a trailing write guarantees the settled value lands. */
const WUPP_PUBLISH_INTERVAL_MS = 150;

/**
 * R3F component that syncs the Canvas camera, controls, size,
 * and invalidate function into the viewer store so that store
 * actions (fitToLayer, etc.) can operate on the camera directly.
 *
 * Also publishes `worldUnitsPerPixel` for HTML panels (e.g. ScaleBar) —
 * THROTTLED, not per frame: it is a React-subscribed store field, and
 * `camera.position.length()` changes on every pan/orbit/zoom frame, so an
 * unthrottled write re-rendered every subscriber at frame rate (P17).
 * In-canvas consumers (probe markers) don't read the store at all — they
 * compute it from the camera in their own useFrame.
 */
export const CanvasSync = () => {
  const registerCanvas = useViewerStore((s) => s.registerCanvas);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const invalidate = useThree((s) => s.invalidate);
  const storeApi = useViewerStoreApi();
  const lastPublishRef = useRef(0);
  const trailingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWuppRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (trailingRef.current) clearTimeout(trailingRef.current);
    };
  }, []);

  useEffect(() => {
    const ctrl =
      controls && "target" in controls
        ? (controls as unknown as {
            target: THREE.Vector3;
            update: () => void;
          })
        : null;

    registerCanvas({
      camera,
      controls: ctrl,
      size,
      dpr,
      invalidate,
    });
    // `dpr` is a dep so the registered context tracks the quality governor's
    // DPR switches; nothing subscribes to `canvas` in React, so the extra
    // writes cost a store set and no renders.
  }, [camera, controls, invalidate, registerCanvas, size, dpr]);

  // Publish worldUnitsPerPixel at a bounded cadence (leading + trailing).
  useFrame(({ camera, size }) => {
    const wupp = computeWorldUnitsPerPixel(camera, size.height);
    // Dead-band: skip when the value is effectively unchanged.
    const prev = storeApi.getState().worldUnitsPerPixel;
    if (Math.abs(wupp - prev) <= prev * 0.001) return;

    const now = performance.now();
    if (now - lastPublishRef.current >= WUPP_PUBLISH_INTERVAL_MS) {
      lastPublishRef.current = now;
      pendingWuppRef.current = null;
      storeApi.getState().setWorldUnitsPerPixel(wupp);
      return;
    }
    // Trailing write so the settled value always lands after motion stops.
    // The timer is armed ONCE per throttle window and reads the freshest
    // value from the ref when it fires — the previous clearTimeout +
    // setTimeout on every in-window frame (~54×/s during a smooth zoom) was
    // pure allocation and timer-heap churn.
    pendingWuppRef.current = wupp;
    if (trailingRef.current === null) {
      trailingRef.current = setTimeout(() => {
        trailingRef.current = null;
        const pending = pendingWuppRef.current;
        pendingWuppRef.current = null;
        if (pending === null) return;
        lastPublishRef.current = performance.now();
        storeApi.getState().setWorldUnitsPerPixel(pending);
      }, WUPP_PUBLISH_INTERVAL_MS);
    }
  });

  return null;
};
