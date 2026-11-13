import type { ProbeResult } from "./probeTypes";

/**
 * Decides which click probes become probe points.
 *
 * The layers publish their click probe on pointer DOWN — any button, before
 * anyone knows whether a drag follows — so a probe alone is not a click. This
 * pairs it with the press it came from, as the scene's press ledger accounts
 * for it (`platform/input/pressLedger.ts`): a primary-button press that was
 * the tool's and ended as a click. Pure (the presses and the clock come in as
 * arguments), so the gesture rules are testable without a canvas.
 *
 *  - the probe a press produced is HELD until that press ends as a click;
 *  - a press that ends any other way — a drag, a cancelled pointer, a release
 *    nobody saw — drops what it held. It used to wait for the browser's
 *    `click`, which never comes for those: the press stayed open, later
 *    probes were held as its candidates, and the next click pinned the wrong
 *    one;
 *  - a probe that arrives just after the click (a mesh pick resolves on the
 *    GPU, a frame or two behind the event) still counts as that click's;
 *  - anything else is a re-publish of a click already handled, and may only
 *    refresh the point it belongs to;
 *  - shift+click is the "drop a point annotation" gesture and pins nothing.
 */

/** How long after a click a probe may still arrive and count as its own. */
export const PIN_LATE_PROBE_MS = 400;
/**
 * How long a PROBE click on data that is still loading waits for it
 * (`BrickVolumeLayer.waitForProbe` asks again as the bricks land). The
 * pinner keeps such a click open this long instead of `PIN_LATE_PROBE_MS`.
 */
export const PROBE_WAIT_MS = 1500;

export interface ProbePinGate {
  /**
   * A press landed on the canvas. `pins` says whether it could become a
   * point at all: the primary button, the tool's (not the hand's), no shift.
   */
  pressDown(press: { pins: boolean }): void;
  /**
   * That press ended; `click` is the ledger's verdict. `lateMs` is how long a
   * probe may still arrive and be this click's (default `PIN_LATE_PROBE_MS`).
   */
  pressEnd(end: { click: boolean; lateMs?: number }): void;
  /** A new probe was published. */
  probe(probe: ProbeResult | null): void;
}

export function createProbePinGate(deps: {
  now: () => number;
  /** Probing is the active mode — the toolbar's PROBE, or P held. */
  probing: () => boolean;
  pin: (probe: ProbeResult) => void;
  refresh: (probe: ProbeResult) => void;
}): ProbePinGate {
  /** A press that may pin is still down. */
  let pressed = false;
  /** The click probe that press produced, waiting for the release. */
  let candidate: ProbeResult | null = null;
  let lateUntil = 0;

  return {
    pressDown(press) {
      candidate = null;
      lateUntil = 0;
      pressed = press.pins;
    },
    pressEnd(end) {
      const was = pressed;
      const held = candidate;
      pressed = false;
      candidate = null;
      if (!was || !end.click) return;
      if (held) deps.pin(held);
      else if (deps.probing()) lateUntil = deps.now() + (end.lateMs ?? PIN_LATE_PROBE_MS);
    },
    probe(probe) {
      // "placement" probes are the annotation cursor, never a measurement.
      if (!probe || probe.origin !== "click" || probe.purpose !== "readout") return;
      if (pressed) {
        if (deps.probing()) candidate = probe;
        return;
      }
      if (deps.now() < lateUntil) {
        lateUntil = 0;
        deps.pin(probe);
        return;
      }
      deps.refresh(probe);
    },
  };
}
