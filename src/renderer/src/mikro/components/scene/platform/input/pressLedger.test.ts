import { describe, expect, it, vi } from "vitest";

import { DOUBLE_PRESS_MS } from "./navigationBindings";
import { CLICK_SLOP_PX, createPressLedger, type PressEnd, type PressOwner } from "./pressLedger";

const tool = (): PressOwner => "tool";
const camera = (): PressOwner => "camera";
const down = (over: Partial<{ pointerId: number; button: number; x: number; y: number; at: number; shift: boolean }> = {}) => ({
  pointerId: 1,
  button: 0,
  x: 100,
  y: 100,
  at: 0,
  shift: false,
  ...over,
});

const recording = () => {
  const ledger = createPressLedger();
  const ends: PressEnd[] = [];
  ledger.onEnd((end) => ends.push(end));
  return { ledger, ends };
};

describe("press ledger", () => {
  it("has no press until one lands, and none once it is released", () => {
    const { ledger } = recording();
    expect(ledger.current()).toBeNull();
    const press = ledger.down(down(), tool);
    expect(ledger.current()).toBe(press);
    ledger.up({ pointerId: 1, x: 100, y: 100 });
    expect(ledger.current()).toBeNull();
    expect(ledger.last()?.press).toBe(press);
  });

  it("tells the end only once the release has settled", () => {
    const { ledger, ends } = recording();
    ledger.down(down(), tool);
    ledger.up({ pointerId: 1, x: 100, y: 100 });
    expect(ends).toHaveLength(0);
    ledger.settle();
    ledger.settle();
    expect(ends).toHaveLength(1);
    expect(ends[0]).toMatchObject({ reason: "released", click: true });
  });

  it("ends a press whose release never came when the next one lands", () => {
    const { ledger, ends } = recording();
    const first = ledger.down(down(), camera);
    const second = ledger.down(down({ at: 5000 }), tool);
    expect(ends).toHaveLength(1);
    expect(ends[0]).toMatchObject({ press: first, reason: "cancelled", click: false });
    expect(ledger.current()).toBe(second);
    expect(ledger.owner()).toBe("tool");
  });

  it("settles a released press before the next one opens", () => {
    const { ledger, ends } = recording();
    ledger.down(down(), tool);
    ledger.up({ pointerId: 1, x: 100, y: 100 });
    ledger.down(down({ at: 5000 }), tool);
    expect(ends.map((end) => end.reason)).toEqual(["released"]);
  });

  it("cancels at once, and only a press that is open", () => {
    const { ledger, ends } = recording();
    ledger.cancel();
    expect(ends).toHaveLength(0);
    ledger.down(down(), tool);
    ledger.move({ pointerId: 1, x: 140, y: 100 });
    ledger.cancel();
    ledger.cancel();
    expect(ends).toHaveLength(1);
    expect(ends[0]).toMatchObject({ reason: "cancelled", click: false, x: 140, y: 100 });
    expect(ledger.current()).toBeNull();
  });

  it("ignores another pointer's release", () => {
    const { ledger, ends } = recording();
    const press = ledger.down(down(), tool);
    expect(ledger.up({ pointerId: 2, x: 100, y: 100 })).toBeNull();
    ledger.settle();
    expect(ledger.current()).toBe(press);
    expect(ends).toHaveLength(0);
  });

  it("calls a release where it landed a click, up to the slop", () => {
    const { ledger } = recording();
    ledger.down(down(), tool);
    expect(ledger.up({ pointerId: 1, x: 100 + CLICK_SLOP_PX, y: 100 })?.click).toBe(true);
    ledger.down(down({ at: 5000 }), tool);
    expect(ledger.up({ pointerId: 1, x: 100 + CLICK_SLOP_PX + 1, y: 100 })?.click).toBe(false);
  });

  it("does not call a drag that came back a click", () => {
    const { ledger } = recording();
    ledger.down(down(), tool);
    ledger.move({ pointerId: 1, x: 160, y: 100 });
    ledger.move({ pointerId: 1, x: 100, y: 100 });
    expect(ledger.up({ pointerId: 1, x: 100, y: 100 })?.click).toBe(false);
  });

  it("counts the presses of a multi-click and asks the owner with the count", () => {
    const { ledger } = recording();
    const owner = vi.fn((count: number): PressOwner => (count >= 2 ? "tool" : "camera"));
    expect(ledger.down(down({ at: 0 }), owner)).toMatchObject({ count: 1, owner: "camera" });
    ledger.up({ pointerId: 1, x: 100, y: 100 });
    expect(ledger.down(down({ at: 200 }), owner)).toMatchObject({ count: 2, owner: "tool" });
    ledger.up({ pointerId: 1, x: 100, y: 100 });
    expect(ledger.count()).toBe(2);
    expect(ledger.down(down({ at: 200 + DOUBLE_PRESS_MS + 1 }), owner)).toMatchObject({ count: 1 });
  });

  it("gives a middle or right press to the camera without asking", () => {
    const { ledger } = recording();
    const owner = vi.fn(tool);
    expect(ledger.down(down({ button: 2 }), owner).owner).toBe("camera");
    expect(ledger.down(down({ button: 1 }), owner).owner).toBe("camera");
    expect(owner).not.toHaveBeenCalled();
  });

  it("answers for the press that just ended until the next one lands", () => {
    const { ledger } = recording();
    expect(ledger.owner()).toBe("tool");
    ledger.down(down(), camera);
    ledger.up({ pointerId: 1, x: 100, y: 100 });
    expect(ledger.owner()).toBe("camera");
    ledger.down(down({ at: 5000 }), tool);
    expect(ledger.owner()).toBe("tool");
  });

  it("tells every listener the end even when one throws", () => {
    const ledger = createPressLedger();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const heard = vi.fn();
    ledger.onEnd(() => {
      throw new Error("tool failed");
    });
    ledger.onEnd(heard);
    ledger.down(down(), tool);
    ledger.cancel();
    expect(heard).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("stops telling a listener that left", () => {
    const ledger = createPressLedger();
    const heard = vi.fn();
    const leave = ledger.onEnd(heard);
    leave();
    ledger.down(down(), tool);
    ledger.cancel();
    expect(heard).not.toHaveBeenCalled();
  });
});
