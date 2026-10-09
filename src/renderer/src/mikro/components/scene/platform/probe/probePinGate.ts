import type { ProbeResult } from "./probeTypes";

/**
 * Decides which click probes become probe points.
 *
 * The layers publish their click probe on pointer DOWN — any button, before
 * anyone knows whether a drag follows — so a probe alone is not a click. This
 * pairs it with the browser's own verdict: a primary-button `click` on the
 * canvas that did not travel. Pure (events and the clock come in as
 * arguments), so the gesture rules are testable without a canvas.
 *
 *  - the probe a press produced is HELD until that press ends as a click;
 *  - a probe that arrives just after the click (a mesh pick resolves on the
 *    GPU, a frame or two behind the event) still counts as that click's;
 *  - anything else is a re-publish of a click already handled, and may only
 *    refresh the point it belongs to;
 *  - shift+click is the "drop a point annotation" gesture and pins nothing.
 */

/** Further than this between press and release is a drag — the same
 * screen-pixel threshold the annotation drawers use. */
export const PIN_CLICK_SLOP_PX = 4;
/** How long after a click a probe may still arrive and count as its own. */
export const PIN_LATE_PROBE_MS = 400;

export interface PinPointerEvent {
  x: number;
  y: number;
  button: number;
  shift: boolean;
  /** The event landed on the scene canvas (not on a panel over it). */
  onCanvas: boolean;
}

export interface ProbePinGate {
  pointerDown(event: PinPointerEvent): void;
  click(event: Pick<PinPointerEvent, "x" | "y">): void;
  cancel(): void;
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
  /** The primary-button press on the canvas that is still down. */
  let press: { x: number; y: number; shift: boolean } | null = null;
  /** The click probe that press produced, waiting for the release. */
  let candidate: ProbeResult | null = null;
  let lateUntil = 0;

  return {
    pointerDown(event) {
      candidate = null;
      lateUntil = 0;
      press =
        event.onCanvas && event.button === 0
          ? { x: event.x, y: event.y, shift: event.shift }
          : null;
    },
    click(event) {
      const from = press;
      const held = candidate;
      press = null;
      candidate = null;
      if (!from || from.shift) return;
      const dx = event.x - from.x;
      const dy = event.y - from.y;
      if (dx * dx + dy * dy > PIN_CLICK_SLOP_PX * PIN_CLICK_SLOP_PX) return;
      if (held) deps.pin(held);
      else if (deps.probing()) lateUntil = deps.now() + PIN_LATE_PROBE_MS;
    },
    cancel() {
      press = null;
      candidate = null;
    },
    probe(probe) {
      // "placement" probes are the annotation cursor, never a measurement.
      if (!probe || probe.origin !== "click" || probe.purpose !== "readout") return;
      if (press) {
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
