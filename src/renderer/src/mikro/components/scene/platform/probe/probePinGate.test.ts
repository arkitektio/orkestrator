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

const down = { pins: true };
const click = { click: true };
const drag = { click: false };

describe("probe pin gate", () => {
  it("pins the probe a press produced once the press ends as a click", () => {
    const { gate, pinned } = build();
    const p = probe();
    gate.pressDown(down);
    gate.probe(p);
    expect(pinned).toEqual([]);
    gate.pressEnd(click);
    expect(pinned).toEqual([p]);
  });

  it("does not pin a drag, or a press that may not pin", () => {
    const { gate, pinned } = build();
    gate.pressDown(down);
    gate.probe(probe());
    gate.pressEnd(drag);

    // A right-drag orbit, a shift+click, the hand: the layer still publishes
    // a click probe on the way down.
    gate.pressDown({ pins: false });
    gate.probe(probe());
    gate.pressEnd(click);

    expect(pinned).toEqual([]);
  });

  it("holds nothing over from a press that did not end as a click", () => {
    const { gate, pinned, refreshed } = build();
    const dragged = probe();
    gate.pressDown(down);
    gate.probe(dragged);
    gate.pressEnd(drag);

    // The press is over: a probe published now is nobody's candidate.
    const stray = probe();
    gate.probe(stray);
    expect(refreshed).toEqual([stray]);

    // And the next click pins its own probe, not the drag's.
    const mine = probe();
    gate.pressDown(down);
    gate.probe(mine);
    gate.pressEnd(click);
    expect(pinned).toEqual([mine]);
  });

  it("ignores hover and placement probes", () => {
    const { gate, pinned, refreshed } = build();
    gate.pressDown(down);
    gate.probe(probe({ origin: "hover" }));
    gate.probe(probe({ purpose: "placement" }));
    gate.pressEnd(click);
    expect(pinned).toEqual([]);
    expect(refreshed).toEqual([]);
  });

  it("accepts a probe that lands just after its click, once", () => {
    const { gate, pinned, refreshed, clock } = build();
    const late = probe();
    gate.pressDown(down);
    gate.pressEnd(click);
    clock.now = PIN_LATE_PROBE_MS - 1;
    gate.probe(late);
    expect(pinned).toEqual([late]);

    // The same pick re-published (its objectId landed): a refresh, not a pin.
    const again = probe();
    gate.probe(again);
    expect(pinned).toEqual([late]);
    expect(refreshed).toEqual([again]);
  });

  it("keeps a click on loading data open for as long as it is told to", () => {
    const { gate, pinned, clock } = build();
    const late = probe();
    gate.pressDown(down);
    gate.pressEnd({ click: true, lateMs: 1500 });
    clock.now = PIN_LATE_PROBE_MS + 500;
    gate.probe(late);
    expect(pinned).toEqual([late]);
  });

  it("only refreshes a probe that belongs to no click", () => {
    const { gate, pinned, refreshed, clock } = build();
    gate.pressDown(down);
    gate.pressEnd(click);
    clock.now = PIN_LATE_PROBE_MS + 1;
    const stray = probe();
    gate.probe(stray);
    expect(pinned).toEqual([]);
    expect(refreshed).toEqual([stray]);
  });

  it("pins nothing outside probe mode", () => {
    const { gate, pinned } = build(false);
    gate.pressDown(down);
    gate.probe(probe());
    gate.pressEnd(click);
    gate.probe(probe());
    expect(pinned).toEqual([]);
  });
});
