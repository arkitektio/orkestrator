// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The cross-fade holds the outgoing word until its exit animation finishes,
// which never happens under fake timers; test the cycling, not the fade.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: { span: (props: React.ComponentProps<"span">) => <span className={props.className}>{props.children}</span> },
  useReducedMotion: () => false,
}));

import { CyclingPlaceholder } from "./CyclingPlaceholder";

const setFocus = (focused: boolean) =>
  act(() => {
    window.dispatchEvent(new Event(focused ? "focus" : "blur"));
  });

describe("CyclingPlaceholder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rests on the first word while the window is active", () => {
    render(<CyclingPlaceholder words={["A", "B"]} interval={100} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByText("B")).toBeNull();
  });

  it("cycles while inactive and resets when focus returns", async () => {
    render(<CyclingPlaceholder words={["A", "B"]} interval={100} />);
    setFocus(false);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByText("B")).toBeInTheDocument();

    setFocus(true);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
