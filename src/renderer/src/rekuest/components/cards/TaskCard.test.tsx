// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/linkers", () => {
  const Link = ({ children }: { children: React.ReactNode }) => <a>{children}</a>;
  return {
    RekuestTask: {
      Smart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      DetailLink: Link,
    },
  };
});
vi.mock("../logo/BlokLogo", () => ({ BlokLogo: () => <span>logo</span> }));
vi.mock("@/core/ui/timestamp", () => ({
  default: () => <span>some time ago</span>,
}));

import { ListTaskFragment, TaskEventKind } from "../../api/graphql";
import { formatDuration } from "../../lib/taskTimeline";
import TaskCard from "./TaskCard";

const task = (over: Partial<ListTaskFragment>): ListTaskFragment => ({
  id: "t1",
  reference: null,
  latestEventKind: TaskEventKind.Progress,
  isDone: false,
  finishedAt: null,
  createdAt: "2026-09-17T10:00:00.000Z",
  latestProgress: null,
  latestMessage: null,
  latestReturns: null,
  action: { id: "a1", name: "Segment Cells", logo: null, returns: [] },
  implementation: { id: "i1", interface: "segment_cells" },
  agent: { id: "ag1", name: "napari-lab" },
  events: [],
  ...over,
});

const event = (over: Partial<ListTaskFragment["events"][number]>) => ({
  id: Math.random().toString(),
  kind: TaskEventKind.Progress,
  progress: null,
  message: null,
  createdAt: "2026-09-17T10:00:01.000Z",
  ...over,
});

describe("TaskCard", () => {
  it("names the action, the agent running it and the status", () => {
    render(<TaskCard item={task({})} />);
    expect(screen.getByText("Segment Cells")).toBeTruthy();
    expect(screen.getByText("napari-lab")).toBeTruthy();
    expect(screen.getByText("Running")).toBeTruthy();
    // No logo blok: the action's initials stand in.
    expect(screen.getByText("SC")).toBeTruthy();
  });

  it("follows a running task by the server's latest progress and message", () => {
    render(
      <TaskCard
        item={task({
          latestProgress: 70,
          latestMessage: "Slice 21 of 30",
          events: [event({ progress: 40, message: "Slice 12 of 30" })],
        })}
      />,
    );
    expect(screen.getByText("70%")).toBeTruthy();
    expect(screen.getByText("Slice 21 of 30")).toBeTruthy();
    // Where it runs stays in the facts; what it says is the line under them.
    expect(screen.getByText("napari-lab")).toBeTruthy();
    expect(screen.queryByText("Slice 12 of 30")).toBeNull();
  });

  it("falls back to the newest event's progress and message", () => {
    render(
      <TaskCard
        item={task({
          events: [
            event({ message: "Slice 12 of 30" }),
            event({ progress: 40 }),
            event({ progress: 10, message: "Starting" }),
          ],
        })}
      />,
    );
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText("Slice 12 of 30")).toBeTruthy();
    expect(screen.queryByText("Starting")).toBeNull();
  });

  it("drops progress and chatter once done, and reports the duration", () => {
    render(
      <TaskCard
        item={task({
          isDone: true,
          latestEventKind: TaskEventKind.Completed,
          finishedAt: "2026-09-17T10:00:42.500Z",
          events: [event({ progress: 100, message: "All good" })],
        })}
      />,
    );
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("· 42.5 s")).toBeTruthy();
    expect(screen.getByText("napari-lab")).toBeTruthy();
    expect(screen.queryByText("100%")).toBeNull();
    // How it ended is the line under its name.
    expect(screen.getByText("All good")).toBeTruthy();
  });

  it("says a finished run that said nothing was successfully done", () => {
    render(
      <TaskCard
        item={task({ isDone: true, latestEventKind: TaskEventKind.Completed, finishedAt: "2026-09-17T10:00:01.000Z" })}
      />,
    );
    expect(screen.getByText("Successfully done")).toBeTruthy();
  });

  it("never reads the runtime's own queue line as how a run ended", () => {
    render(
      <TaskCard
        item={task({
          isDone: true,
          latestEventKind: TaskEventKind.Completed,
          finishedAt: "2026-09-17T10:00:01.000Z",
          latestMessage: "Queued for running",
          events: [event({ progress: 0, message: "Queued for running" })],
        })}
      />,
    );
    expect(screen.getByText("Successfully done")).toBeTruthy();
    expect(screen.queryByText("Queued for running")).toBeNull();
  });

  it("surfaces the failure message of a failed task", () => {
    const { container } = render(
      <TaskCard
        item={task({
          latestEventKind: TaskEventKind.Critical,
          finishedAt: "2026-09-17T10:00:02.000Z",
          events: [event({ kind: TaskEventKind.Critical, message: "CUDA out of memory" })],
        })}
      />,
    );
    expect(screen.getByText("Critical")).toBeTruthy();
    expect(screen.getByText("CUDA out of memory").className).toContain("text-destructive");
    expect(container.querySelector(".bg-destructive\\/15")).toBeTruthy();
  });

  it("says its state in a coloured pill, and lets a long-finished run step back", () => {
    const done = (finishedAt: string) =>
      task({ isDone: true, latestEventKind: TaskEventKind.Completed, finishedAt, createdAt: finishedAt });
    const { container, rerender } = render(<TaskCard item={done(new Date().toISOString())} />);
    expect(screen.getByText("Completed").closest(".bg-success\\/15")).toBeTruthy();
    expect(container.querySelector(".saturate-50")).toBeNull();
    rerender(<TaskCard item={done("2020-01-01T00:00:00.000Z")} />);
    expect(container.querySelector(".saturate-50")).toBeTruthy();
  });

  it("renders a task that has no agent yet", () => {
    render(<TaskCard item={task({ agent: null, latestEventKind: TaskEventKind.Queued })} />);
    expect(screen.getByText("Queued")).toBeTruthy();
    expect(screen.getByText("No app yet")).toBeTruthy();
  });
});

describe("formatDuration", () => {
  it("scales its unit with the magnitude", () => {
    expect(formatDuration(340)).toBe("340 ms");
    expect(formatDuration(4200)).toBe("4.20 s");
    expect(formatDuration(187_000)).toBe("3m 07s");
    expect(formatDuration(7_500_000)).toBe("2h 05m");
  });

  it("never rolls seconds over to 60", () => {
    expect(formatDuration(119_600)).toBe("2m 00s");
  });
});
