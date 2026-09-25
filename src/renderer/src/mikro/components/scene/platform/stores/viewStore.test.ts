import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createViewStore } from "./viewStore";

/**
 * The trailing interaction pulse: `markInteraction` is called per live-edit
 * tick (a clim drag) and `interacting` must hold true across the whole drag,
 * fall `ttl` after the LAST tick, and notify subscribers only on the edges —
 * the quality consumers (StepScaleDriver, VolumeCompositor) treat it exactly
 * like `cameraMoving`, so a chatty flag would defeat its own purpose.
 */
describe("viewStore.markInteraction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds through re-arms and falls after the last one's ttl", () => {
    const store = createViewStore();
    expect(store.getState().interacting).toBe(false);

    store.getState().markInteraction(250);
    expect(store.getState().interacting).toBe(true);

    // Re-arm mid-flight: the falling edge moves out with the LAST call.
    vi.advanceTimersByTime(200);
    store.getState().markInteraction(250);
    vi.advanceTimersByTime(200);
    expect(store.getState().interacting).toBe(true);

    vi.advanceTimersByTime(60);
    expect(store.getState().interacting).toBe(false);
  });

  it("notifies subscribers only on the edges, not per tick", () => {
    const store = createViewStore();
    const listener = vi.fn();
    store.subscribe(listener);

    for (let tick = 0; tick < 10; tick++) {
      store.getState().markInteraction(250);
      vi.advanceTimersByTime(16);
    }
    expect(listener).toHaveBeenCalledTimes(1); // rising edge only

    vi.advanceTimersByTime(300);
    expect(listener).toHaveBeenCalledTimes(2); // + falling edge
    expect(store.getState().interacting).toBe(false);
  });

  it("survives camera emissions (partial set keeps the flag)", () => {
    const store = createViewStore();
    store.getState().markInteraction(250);
    store
      .getState()
      .updateCameraData(
        // A bare matrix is all updateCameraData needs for this assertion.
        { elements: new Array(16).fill(0) } as never,
        { width: 100, height: 100 },
        undefined,
        true,
      );
    expect(store.getState().interacting).toBe(true);
    expect(store.getState().cameraMoving).toBe(true);
  });
});
