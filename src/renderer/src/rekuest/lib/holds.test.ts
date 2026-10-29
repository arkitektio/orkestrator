// @vitest-environment jsdom
// (the generated rekuest API module reads `window` on import)
import { describe, expect, it } from "vitest";
import { TaskEventKind } from "../api/graphql";
import { askClosed, decisionFromEvent, holdFromEvent, informFromEvent, pendingHolds } from "./holds";

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

describe("bloks a task shows", () => {
  it("reads the blok a hold asks through, and the values it was answered with", () => {
    expect(holdFromEvent(ev(TaskEventKind.Held, { kind: "self", blok: "m3" }, "1"))?.blok).toBe("m3");
    expect(holdFromEvent(ev(TaskEventKind.Held, { kind: "self" }, "1"))?.blok).toBeUndefined();
    const values = { image: { __identifier: "@mikro/image", object: "8" } };
    expect(decisionFromEvent(ev(TaskEventKind.Decided, { approved: true, values, user: "s1" }, "2"))).toMatchObject({
      values,
      user: "s1",
    });
  });

  it("reads what an inform shows", () => {
    expect(informFromEvent(ev(TaskEventKind.Inform, { blok: "m4" }, "1", "Halfway"))).toEqual({
      task: "root",
      blok: "m4",
      message: "Halfway",
    });
    expect(informFromEvent(ev(TaskEventKind.Log, { blok: "m4" }, "1"))).toBeNull();
  });
});

describe("askClosed", () => {
  const held = { kind: TaskEventKind.Held };
  it("leaves the asks of a task that goes on open", () => {
    expect(askClosed({ isDone: false, latestEventKind: TaskEventKind.Held, events: [held] })).toBeNull();
  });
  it("closes them once a cancel or interrupt is asked for, even after a later log", () => {
    expect(
      askClosed({ latestEventKind: TaskEventKind.Log, events: [held, { kind: TaskEventKind.Cancelling }, { kind: TaskEventKind.Log }] }),
    ).toBe("cancelling");
    expect(askClosed({ latestEventKind: TaskEventKind.Interrupting, events: [held] })).toBe("interrupting");
  });
  it("says ended once the task is done, whatever it was doing before", () => {
    expect(askClosed({ isDone: true, latestEventKind: TaskEventKind.Held })).toBe("ended");
    expect(askClosed({ events: [held, { kind: TaskEventKind.Cancelling }, { kind: TaskEventKind.Cancelled }] })).toBe("ended");
  });
});
