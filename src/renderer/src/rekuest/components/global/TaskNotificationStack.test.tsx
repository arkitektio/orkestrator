// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notifications = vi.fn();
const cancel = vi.fn();
const myTasks = vi.fn();

// Exits wait for an animation that never finishes under fake timers, and the
// leaving node would linger in the DOM and defeat every "is gone" assertion.
// Test what the island shows and when, not the tween. Components are cached
// per tag: a fresh one per access would remount the tree on every render.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MOTION_ONLY = [
    "layout",
    "layoutDependency",
    "layoutScroll",
    "initial",
    "animate",
    "exit",
    "transition",
  ];
  const cache = new Map<string, React.ElementType>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, (props: Record<string, unknown>) => {
            const rest = { ...props };
            for (const key of MOTION_ONLY) delete rest[key];
            return React.createElement(tag, rest);
          });
        }
        return cache.get(tag);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useReducedMotion: () => false,
  };
});
vi.mock("../../lib/taskNotifications", () => ({
  useTaskNotifications: () => notifications(),
  dismiss: vi.fn(),
}));
// The generated module drags in the Apollo client and `window.electron`.
vi.mock("@/rekuest/api/graphql", () => ({
  TaskEventKind: {
    Bound: "BOUND",
    Cancelled: "CANCELLED",
    Cancelling: "CANCELLING",
    Completed: "COMPLETED",
    Critical: "CRITICAL",
    Delegate: "DELEGATE",
    Failed: "FAILED",
    Interrupted: "INTERRUPTED",
    Interrupting: "INTERRUPTING",
    Progress: "PROGRESS",
    Queued: "QUEUED",
    Started: "STARTED",
    Yield: "YIELD",
  },
  LogLevel: { Info: "INFO" },
  PortKind: {},
  useCancelMutation: () => [cancel, { loading: false }],
}));
// `deriveLiveState` stays real — it is what turns events into what a row
// shows; only the Apollo-backed list is replaced.
vi.mock("@/rekuest/hooks/useTasks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/rekuest/hooks/useTasks")>()),
  useTasks: () => ({ data: { myTasks: myTasks() } }),
}));
vi.mock("@/linkers", () => ({
  RekuestTask: {
    DetailLink: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
      "aria-label"?: string;
    }) => <a aria-label={rest["aria-label"]}>{children}</a>,
  },
}));
vi.mock("../task/YieldDisplay", () => ({
  DynamicYieldDisplay: () => <div>yield</div>,
}));

import { dismiss } from "../../lib/taskNotifications";
import { TaskNotificationStack } from "./TaskNotificationStack";

/**
 * A name far longer than the 240px rail can show. jsdom does no layout, so what
 * is asserted is the containment CONTRACT — the classes that decide whether the
 * row clips or grows — rather than a measured width.
 */
const LONG_NAME =
  "reconstruct_and_segment_timeseries_with_a_very_long_action_name_that_never_ends";

type Event = {
  id: string;
  kind: string;
  progress?: number;
  message?: string;
  returns?: unknown[];
};

const makeTask = (
  id: string,
  over: {
    name?: string;
    kind?: string;
    isDone?: boolean;
    events?: Event[];
    finishedAt?: string | null;
  } = {},
) => ({
  id,
  latestEventKind: over.kind ?? "PROGRESS",
  isDone: over.isDone ?? false,
  createdAt: "2026-09-17T10:00:00.000Z",
  finishedAt: over.finishedAt ?? null,
  action: { id: "act", name: over.name ?? `action ${id}` },
  // Newest first, as the cache keeps them.
  events: over.events ?? [{ id: `${id}-e1`, kind: "PROGRESS", progress: 42 }],
});

const doneTask = (id: string, events?: Event[]) =>
  makeTask(id, {
    kind: "COMPLETED",
    isDone: true,
    finishedAt: "2026-09-17T10:00:04.200Z",
    events: events ?? [{ id: `${id}-done`, kind: "COMPLETED" }],
  });

const show = (tasks: ReturnType<typeof makeTask>[]) => {
  notifications.mockReturnValue(tasks.map((task) => task.id));
  myTasks.mockReturnValue(tasks);
};

const rows = () => screen.queryAllByTestId("task-island-row");
const header = (name: string | RegExp) => screen.getByRole("button", { name });
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** Rest the pointer on a row's header for long enough to open it. */
const hover = (name: string | RegExp) => {
  fireEvent.pointerEnter(screen.getByTestId("task-island").parentElement!);
  fireEvent.pointerMove(header(name));
  tick(120);
};
const leave = () => {
  fireEvent.pointerLeave(screen.getByTestId("task-island").parentElement!);
  tick(200);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(dismiss).mockClear();
  cancel.mockClear();
  show([makeTask("t1", { name: LONG_NAME })]);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("a row in the task island", () => {
  it("clips a long action name instead of widening the rail", () => {
    render(<TaskNotificationStack />);
    const row = header(new RegExp(LONG_NAME));

    // `min-w-0` is the load-bearing one: without it a flex item's automatic
    // minimum size is its content, so `truncate` never engages and the row
    // pushes the rail wider.
    expect(row.className).toContain("min-w-0");
    expect(row.className).toContain("overflow-hidden");

    const label = screen.getByText(LONG_NAME);
    expect(label.className).toContain("truncate");
    expect(label.className).toContain("min-w-0");
    expect(label.className).toContain("flex-1");
  });

  it("keeps the fixed-size parts from being squeezed out by the name", () => {
    const { container } = render(<TaskNotificationStack />);
    expect(container.querySelector("[data-state]")?.className).toContain(
      "shrink-0",
    );
    expect(screen.getByText("42%").className).toContain("shrink-0");
  });

  it("shows the task's state in the ring", () => {
    show([
      makeTask("q", { kind: "QUEUED", events: [] }),
      makeTask("c", { kind: "CANCELLING", events: [] }),
      doneTask("d"),
    ]);
    const { container } = render(<TaskNotificationStack />);
    const states = [...container.querySelectorAll("[data-state]")].map(
      (ring) => ring.getAttribute("data-state"),
    );
    expect(states).toEqual(["queued", "stopping", "done"]);
  });

  it("is a plain disclosure button with nothing interactive inside it", () => {
    render(<TaskNotificationStack />);
    const row = header(new RegExp(LONG_NAME));
    expect(row.tagName).toBe("BUTTON");
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(row.hasAttribute("aria-controls")).toBe(false);
    expect(within(row).queryByRole("button")).toBeNull();
    expect(within(row).queryByRole("link")).toBeNull();
  });
});

describe("the island as a whole", () => {
  it("renders nothing at all when no task is running", () => {
    show([]);
    const { container } = render(<TaskNotificationStack />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows several tasks at once, working ones above finished ones", () => {
    show([doneTask("d"), makeTask("r1"), makeTask("r2")]);
    render(<TaskNotificationStack />);
    expect(rows().map((row) => row.textContent)).toEqual([
      "action r142%",
      "action r242%",
      "action d",
    ]);
  });

  it("shows at most three rows and no stacked edge until there are more", () => {
    show([makeTask("a"), makeTask("b"), makeTask("c")]);
    const { unmount } = render(<TaskNotificationStack />);
    expect(rows()).toHaveLength(3);
    expect(screen.queryByTestId("task-stack-peek")).toBeNull();
    unmount();

    show(["a", "b", "c", "d", "e"].map((id) => makeTask(id)));
    render(<TaskNotificationStack />);
    expect(rows()).toHaveLength(3);
    expect(screen.getByTestId("task-stack-peek")).toBeTruthy();
  });

  it("hints at further tasks with a dot each, not a +N counter", () => {
    show(["a", "b", "c", "d", "e"].map((id) => makeTask(id)));
    render(<TaskNotificationStack />);
    const peek = screen.getByRole("button", { name: "Show 2 more tasks" });
    expect(within(peek).getAllByTestId("task-stack-dot")).toHaveLength(2);
    expect(peek.textContent).toBe("");
    expect(screen.queryByText("+2")).toBeNull();
  });

  it("caps the dots so the stacked edge cannot outgrow the rail", () => {
    show(Array.from({ length: 20 }, (_, index) => makeTask(`t${index}`)));
    render(<TaskNotificationStack />);
    expect(screen.getAllByTestId("task-stack-dot")).toHaveLength(8);
  });

  it("unfolds every task from the stacked edge, and scrolls only then", () => {
    show(["a", "b", "c", "d", "e"].map((id) => makeTask(id)));
    render(<TaskNotificationStack />);
    const island = screen.getByTestId("task-island");
    expect(island.className).toContain("max-h-[45vh]");
    expect(island.className).not.toContain("overflow-y-auto");

    fireEvent.click(screen.getByTestId("task-stack-peek"));
    expect(rows()).toHaveLength(5);
    expect(island.className).toContain("overflow-y-auto");
    expect(
      screen.getByRole("button", { name: "Show fewer tasks" }),
    ).toBeTruthy();
  });
});

describe("opening a row", () => {
  it("opens once the pointer has rested on it, not on the way past", () => {
    render(<TaskNotificationStack />);
    const row = header(new RegExp(LONG_NAME));
    fireEvent.pointerMove(row);
    tick(60);
    expect(row.getAttribute("aria-expanded")).toBe("false");
    tick(60);
    expect(row.getAttribute("aria-expanded")).toBe("true");
  });

  it("points aria-controls at the region it opened", () => {
    render(<TaskNotificationStack />);
    hover(new RegExp(LONG_NAME));
    const region = screen.getByRole("region");
    expect(header(new RegExp(LONG_NAME)).getAttribute("aria-controls")).toBe(
      region.id,
    );
  });

  it("closes after the pointer leaves the island, not between rows", () => {
    show([makeTask("a"), makeTask("b")]);
    render(<TaskNotificationStack />);
    hover(/action a/);
    expect(header(/action a/).getAttribute("aria-expanded")).toBe("true");

    fireEvent.pointerLeave(screen.getByTestId("task-island").parentElement!);
    tick(100);
    expect(header(/action a/).getAttribute("aria-expanded")).toBe("true");
    tick(100);
    expect(header(/action a/).getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps one row open at a time", () => {
    show([makeTask("a"), makeTask("b")]);
    render(<TaskNotificationStack />);
    hover(/action a/);
    // Past the settle window, during which hover is deliberately ignored.
    tick(300);
    fireEvent.pointerMove(header(/action b/));
    tick(120);
    expect(header(/action a/).getAttribute("aria-expanded")).toBe("false");
    expect(header(/action b/).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });

  it("ignores a row sliding under the pointer while another is still opening", () => {
    show([makeTask("a"), makeTask("b")]);
    render(<TaskNotificationStack />);
    hover(/action a/);
    fireEvent.pointerMove(header(/action b/));
    tick(120);
    expect(header(/action a/).getAttribute("aria-expanded")).toBe("true");
    expect(header(/action b/).getAttribute("aria-expanded")).toBe("false");
  });

  it("pins open on click, survives the pointer leaving, and closes on Escape", () => {
    render(<TaskNotificationStack />);
    const row = header(new RegExp(LONG_NAME));
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");

    leave();
    expect(row.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(row, { key: "Escape" });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(row);
  });

  it("closes again on a second click when no pointer is holding it open", () => {
    render(<TaskNotificationStack />);
    const row = header(new RegExp(LONG_NAME));
    fireEvent.click(row);
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("an open row", () => {
  it("keeps message, error and result out of the collapsed line", () => {
    show([
      makeTask("t1", {
        events: [
          { id: "e3", kind: "YIELD", returns: [1] },
          { id: "e2", kind: "PROGRESS", progress: 42, message: "tile 12 of 30" },
        ],
      }),
    ]);
    render(<TaskNotificationStack />);
    expect(screen.queryByText("tile 12 of 30")).toBeNull();
    expect(screen.queryByText("yield")).toBeNull();

    hover(/action t1/);
    expect(screen.getByText("tile 12 of 30")).toBeTruthy();
    expect(screen.getByText("yield")).toBeTruthy();
  });

  it("shows the error instead of the last message once a task failed", () => {
    show([
      makeTask("t1", {
        kind: "FAILED",
        events: [
          { id: "e2", kind: "FAILED", message: "out of memory" },
          { id: "e1", kind: "PROGRESS", progress: 10, message: "tile 1" },
        ],
      }),
    ]);
    render(<TaskNotificationStack />);
    hover(/action t1/);
    expect(screen.getByText("out of memory").className).toContain(
      "break-words",
    );
    expect(screen.queryByText("tile 1")).toBeNull();
  });

  it("offers cancel while the task works, without closing the row", () => {
    render(<TaskNotificationStack />);
    hover(new RegExp(LONG_NAME));
    fireEvent.click(screen.getByLabelText("Cancel task"));
    expect(cancel).toHaveBeenCalled();
    expect(screen.queryByLabelText("Dismiss task")).toBeNull();
    expect(
      header(new RegExp(LONG_NAME)).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("offers dismiss, and how long it took, once the task settled", () => {
    show([doneTask("t1")]);
    render(<TaskNotificationStack />);
    hover(/action t1/);
    expect(screen.queryByLabelText("Cancel task")).toBeNull();
    expect(screen.getByText(/4\.20 s/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Dismiss task"));
    expect(dismiss).toHaveBeenCalledWith("t1");
  });
});

describe("the event pulse", () => {
  it("stays quiet for the event that was already there, then flashes per event", () => {
    const { rerender } = render(<TaskNotificationStack />);
    expect(screen.queryByTestId("task-event-pulse")).toBeNull();

    show([
      makeTask("t1", {
        name: LONG_NAME,
        kind: "YIELD",
        events: [
          { id: "t1-e2", kind: "YIELD", returns: [1] },
          { id: "t1-e1", kind: "PROGRESS", progress: 42 },
        ],
      }),
    ]);
    rerender(<TaskNotificationStack />);

    const pulse = screen.getByTestId("task-event-pulse");
    expect(pulse.className).toContain("animate-task-pulse");
    // A yield flashes purple, as it reads everywhere else.
    expect(pulse.className).toContain("bg-purple-500/25");
  });
});

describe("clearing on its own", () => {
  it("dismisses a quietly finished task after a while", () => {
    show([doneTask("t1")]);
    render(<TaskNotificationStack />);
    tick(7999);
    expect(dismiss).not.toHaveBeenCalled();
    tick(1);
    expect(dismiss).toHaveBeenCalledWith("t1");
  });

  it("keeps a failure, a result, and anything still working", () => {
    show([
      makeTask("running"),
      makeTask("failed", {
        kind: "FAILED",
        events: [{ id: "f1", kind: "FAILED" }],
      }),
      doneTask("yielded", [
        { id: "y2", kind: "COMPLETED" },
        { id: "y1", kind: "YIELD", returns: [1] },
      ]),
    ]);
    render(<TaskNotificationStack />);
    tick(60_000);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("never pulls a row out from under the pointer reading it", () => {
    show([doneTask("t1")]);
    render(<TaskNotificationStack />);
    hover(/action t1/);
    tick(20_000);
    expect(dismiss).not.toHaveBeenCalled();

    leave();
    tick(8000);
    expect(dismiss).toHaveBeenCalledWith("t1");
  });

  it("clears tasks hidden behind the stacked edge too", () => {
    show([
      makeTask("a"),
      makeTask("b"),
      makeTask("c"),
      makeTask("d"),
      doneTask("hidden"),
    ]);
    render(<TaskNotificationStack />);
    expect(screen.queryByText("action hidden")).toBeNull();
    tick(8000);
    expect(dismiss).toHaveBeenCalledWith("hidden");
  });
});
