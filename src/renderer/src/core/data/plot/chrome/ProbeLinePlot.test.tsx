// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProbeLinePlot, type ProbePlotLine } from "./ProbeLinePlot";

const WIDTH = 346; // 300 px of plot once the margins (40 + 6) are taken.
const HEIGHT = 150;

/** jsdom lays nothing out: every element reports a 346 px box, and the observer says so. */
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() {
        this.callback([{ contentRect: { width: WIDTH, height: HEIGHT } } as ResizeObserverEntry], this as never);
      }
      disconnect() {}
      unobserve() {}
    },
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: WIDTH,
    height: HEIGHT,
    right: WIDTH,
    bottom: HEIGHT,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ramp = (from: number) => Float32Array.from({ length: 101 }, (_, i) => from + i);
const LINES: ProbePlotLine[] = [
  { key: "7", values: ramp(0), label: "#7", color: "red" },
  { key: "8", values: ramp(1000), label: "#8", color: "blue" },
];

describe("a probed line, plotted", () => {
  it("ticks both axes and says what it is drawn along", () => {
    const { container, getByText } = render(<ProbeLinePlot lines={[LINES[0]]} axis="t" stride={2} />);
    const labels = Array.from(container.querySelectorAll("text")).map((node) => node.textContent);
    // x runs over the stored line's samples: 101 read at stride 2 is 0…200.
    expect(labels).toContain("200");
    expect(labels).toContain("0");
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
    getByText(/along t, 1 in 2 samples/);
  });

  it("reads out the line nearest the pointer, and a click chooses it", () => {
    const onSelect = vi.fn();
    const { container, getByText } = render(
      <ProbeLinePlot lines={LINES} axis="t" onSelect={onSelect} selected={null} />,
    );
    const svg = container.querySelector("svg")!;
    // Halfway along, near the top of the plot: the high line (#8) is nearest.
    act(() => {
      fireEvent.pointerMove(svg, { clientX: 40 + 150, clientY: 10 });
    });
    getByText("#8 ·");
    fireEvent.click(svg);
    expect(onSelect).toHaveBeenCalledWith("8");
    // Near the bottom: the low line.
    act(() => {
      fireEvent.pointerMove(svg, { clientX: 40 + 150, clientY: 120 });
    });
    getByText("#7 ·");
  });

  it("lets go of the chosen line on a second click", () => {
    const onSelect = vi.fn();
    const { container } = render(<ProbeLinePlot lines={LINES} axis="t" onSelect={onSelect} selected="8" />);
    const svg = container.querySelector("svg")!;
    act(() => {
      fireEvent.pointerMove(svg, { clientX: 40 + 150, clientY: 10 });
    });
    fireEvent.click(svg);
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
