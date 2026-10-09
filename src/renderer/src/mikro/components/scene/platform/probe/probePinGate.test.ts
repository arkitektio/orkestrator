import { describe, expect, it } from "vitest";
import { PIN_LATE_PROBE_MS, createProbePinGate } from "./probePinGate";
import type { ProbeResult } from "./probeTypes";

const probe = (overrides: Partial<ProbeResult> = {}): ProbeResult => ({
  layerId: "layer",
  localPos: [0, 0, 0],
  voxelIndex: [1, 2, 3],
  worldPos: [0, 0, 0],
  strategy: "first-hit",
  origin: "click",
  purpose: "readout",
  values: [],
  provenance: { source: "pending", level: 0 },
  dtype: "uint8",
  sliceSignature: "",
  ...overrides,
});

const build = (probing = true) => {
  const pinned: ProbeResult[] = [];
  const refreshed: ProbeResult[] = [];
  const clock = { now: 0 };
  const gate = createProbePinGate({
    now: () => clock.now,
    probing: () => probing,
    pin: (p) => pinned.push(p),
    refresh: (p) => refreshed.push(p),
  });
  return { gate, pinned, refreshed, clock };
};

const down = { x: 10, y: 10, button: 0, shift: false, onCanvas: true };

describe("probe pin gate", () => {
  it("pins the probe a press produced once the press ends as a click", () => {
    const { gate, pinned } = build();
    const p = probe();
    gate.pointerDown(down);
    gate.probe(p);
    expect(pinned).toEqual([]);
    gate.click({ x: 11, y: 10 });
    expect(pinned).toEqual([p]);
  });

  it("does not pin a drag, a secondary button, a shift+click or a press off the canvas", () => {
    const { gate, pinned } = build();
    gate.pointerDown(down);
    gate.probe(probe());
    gate.click({ x: 30, y: 10 });

    // A right-drag orbit: the layer still publishes a click probe on the way down.
    gate.pointerDown({ ...down, button: 2 });
    gate.probe(probe());

    gate.pointerDown({ ...down, shift: true });
    gate.probe(probe());
    gate.click(down);

    gate.pointerDown({ ...down, onCanvas: false });
    gate.probe(probe());
    gate.click(down);

    expect(pinned).toEqual([]);
  });

  it("ignores hover and placement probes", () => {
    const { gate, pinned, refreshed } = build();
    gate.pointerDown(down);
    gate.probe(probe({ origin: "hover" }));
    gate.probe(probe({ purpose: "placement" }));
    gate.click(down);
    expect(pinned).toEqual([]);
    expect(refreshed).toEqual([]);
  });

  it("accepts a probe that lands just after its click, once", () => {
    const { gate, pinned, refreshed, clock } = build();
    const late = probe();
    gate.pointerDown(down);
    gate.click(down);
    clock.now = PIN_LATE_PROBE_MS - 1;
    gate.probe(late);
    expect(pinned).toEqual([late]);

    // The same pick re-published (its objectId landed): a refresh, not a pin.
    const again = probe();
    gate.probe(again);
    expect(pinned).toEqual([late]);
    expect(refreshed).toEqual([again]);
  });

  it("only refreshes a probe that belongs to no click", () => {
    const { gate, pinned, refreshed, clock } = build();
    gate.pointerDown(down);
    gate.click(down);
    clock.now = PIN_LATE_PROBE_MS + 1;
    const stray = probe();
    gate.probe(stray);
    expect(pinned).toEqual([]);
    expect(refreshed).toEqual([stray]);
  });

  it("pins nothing outside probe mode", () => {
    const { gate, pinned } = build(false);
    gate.pointerDown(down);
    gate.probe(probe());
    gate.click(down);
    gate.probe(probe());
    expect(pinned).toEqual([]);
  });
});
