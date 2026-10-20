// @vitest-environment jsdom
// (the generated rekuest API module reads `window` on import)
import { describe, expect, it } from "vitest";
import { TaskEventKind } from "../api/graphql";
import { decisionFromEvent, holdFromEvent, pendingHolds } from "./holds";

const ev = (kind: TaskEventKind, value: unknown, createdAt: string, message: string | null = null) => ({
  kind,
  value,
  message,
  createdAt,
  task: { id: "root" },
});

describe("holds", () => {
  it("falls back to the server's message, then to the action, when the agent gave no prompt", () => {
    expect(holdFromEvent(ev(TaskEventKind.Held, { held: "c1" }, "1", "blok-assistant wants to run X"))?.title).toBe(
      "blok-assistant wants to run X",
    );
    expect(holdFromEvent(ev(TaskEventKind.Held, { action: { id: "a", name: "X" } }, "1"))?.title).toBe("Run X");
    expect(holdFromEvent(ev(TaskEventKind.Progress, {}, "1"))).toBeNull();
  });

  it("keeps what is still undecided, whatever order the events come in", () => {
    const events = [
      ev(TaskEventKind.Decided, { held: "c1", approved: false }, "3"),
      ev(TaskEventKind.Held, { held: "c2", prompt: { title: "second" } }, "4"),
      ev(TaskEventKind.Held, { held: "c1", prompt: { title: "first" } }, "2"),
    ];
    expect(pendingHolds(events).map((h) => [h.task, h.title])).toEqual([["c2", "second"]]);
  });

  it("reads how a hold was answered: by whom it says, and with what", () => {
    expect(decisionFromEvent(ev(TaskEventKind.Decided, { held: "c1", approved: false, answer: " no ", auto: false }, "1")))
      .toEqual({ task: "c1", approved: false, auto: false, answer: " no " });
    expect(decisionFromEvent(ev(TaskEventKind.Decided, { approved: true, auto: true, answer: "" }, "1"))).toEqual({
      task: "root",
      approved: true,
      auto: true,
      answer: null,
    });
    expect(decisionFromEvent(ev(TaskEventKind.Held, { held: "c1" }, "1"))).toBeNull();
  });
});
