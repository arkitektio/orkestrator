// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const notifications = vi.fn();
const task = vi.fn();
const liveTask = vi.fn();

vi.mock("../../lib/taskNotifications", () => ({
  useTaskNotifications: () => notifications(),
  dismiss: vi.fn(),
}));
vi.mock("@/rekuest/hooks/useTasks", () => ({
  useTask: () => task(),
  useLiveTask: () => liveTask(),
}));
vi.mock("../task/TaskStatusLine", () => ({
  TaskStatusLine: () => <div>status</div>,
}));
vi.mock("../task/YieldDisplay", () => ({
  borderColorForLiveState: () => "",
  DynamicYieldDisplay: () => <div>yield</div>,
}));
vi.mock("../../lib/taskStatus", () => ({
  TaskStatusIcon: ({ className }: { className?: string }) => (
    <span data-testid="status-icon" className={className} />
  ),
}));

import { TaskNotificationStack } from "./TaskNotificationStack";

/**
 * A name far longer than the 240px rail can show. jsdom does no layout, so what
 * is asserted is the containment CONTRACT — the classes that decide whether the
 * row clips or grows — rather than a measured width.
 */
const LONG_NAME =
  "reconstruct_and_segment_timeseries_with_a_very_long_action_name_that_never_ends";

beforeEach(() => {
  notifications.mockReturnValue(["t1"]);
  task.mockReturnValue({ id: "t1", latestEventKind: "YIELD", isDone: false });
  liveTask.mockReturnValue({ actionName: LONG_NAME, progress: 42 });
});

describe("the task pill in the rail", () => {
  it("clips a long action name instead of widening the rail", () => {
    render(<TaskNotificationStack />);
    const pill = screen.getByLabelText("Show tasks");

    // `min-w-0` is the load-bearing one: without it a flex item's automatic
    // minimum size is its content, so `truncate` never engages and the row
    // pushes the rail wider.
    expect(pill.className).toContain("min-w-0");
    expect(pill.className).toContain("overflow-hidden");

    const label = screen.getByText(LONG_NAME);
    expect(label.className).toContain("truncate");
    expect(label.className).toContain("min-w-0");
    expect(label.className).toContain("flex-1");
  });

  it("keeps the fixed-size parts from being squeezed out by the name", () => {
    render(<TaskNotificationStack />);
    expect(screen.getByTestId("status-icon").className).toContain("shrink-0");
    expect(screen.getByText("42%").className).toContain("shrink-0");
  });

  it("shows a +N badge that cannot itself be squeezed", () => {
    notifications.mockReturnValue(["t1", "t2", "t3"]);
    render(<TaskNotificationStack />);
    const badge = screen.getByText("+2");
    expect(badge.className).toContain("shrink-0");
  });

  it("renders nothing at all when no task is running", () => {
    notifications.mockReturnValue([]);
    const { container } = render(<TaskNotificationStack />);
    expect(container).toBeEmptyDOMElement();
  });
});
