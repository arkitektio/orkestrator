import { describe, expect, it } from "vitest";

import { BURST_GAP_MS, createScrollClassifier, type WheelSample } from "./scrollGesture";

const wheel = (overrides: Partial<WheelSample> = {}): WheelSample => ({
  deltaX: 0,
  deltaY: 100,
  deltaMode: 0,
  ctrlKey: false,
  timeStamp: 0,
  ...overrides,
});

describe("scroll classifier", () => {
  it("reads whole one-axis notches as a mouse wheel, and zooms", () => {
    const classify = createScrollClassifier();
    expect(classify(wheel(), "auto")).toBe("zoom");
    expect(classify(wheel({ deltaMode: 1, deltaX: 3 }), "auto")).toBe("zoom");
  });

  it("reads fractional or two-axis deltas as a trackpad swipe", () => {
    expect(createScrollClassifier()(wheel({ deltaY: 2.5 }), "auto")).toBe("swipe");
    expect(createScrollClassifier()(wheel({ deltaX: 4, deltaY: 1 }), "auto")).toBe("swipe");
  });

  it("keeps a swipe a swipe for the rest of its burst", () => {
    const classify = createScrollClassifier();
    expect(classify(wheel({ deltaY: 1.5, timeStamp: 0 }), "auto")).toBe("swipe");
    expect(classify(wheel({ deltaY: 4, timeStamp: 16 }), "auto")).toBe("swipe");
    // After a pause the next gesture is guessed afresh.
    expect(classify(wheel({ deltaY: 100, timeStamp: 16 + BURST_GAP_MS + 1 }), "auto")).toBe("zoom");
  });

  it("treats Ctrl + wheel as a pinch whatever the setting", () => {
    for (const setting of ["auto", "zoom", "pan"] as const) {
      expect(createScrollClassifier()(wheel({ ctrlKey: true }), setting)).toBe("pinch");
    }
  });

  it("lets the setting overrule the guess", () => {
    expect(createScrollClassifier()(wheel({ deltaY: 1.5 }), "zoom")).toBe("zoom");
    expect(createScrollClassifier()(wheel(), "pan")).toBe("swipe");
  });
});
