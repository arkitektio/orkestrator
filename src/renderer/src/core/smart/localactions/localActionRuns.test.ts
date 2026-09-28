import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelLocalActionRun,
  dismissLocalActionRun,
  finishLocalActionRun,
  localActionRunStore,
  resetLocalActionRuns,
  selectRunForKey,
  setLocalActionRunProgress,
  startLocalActionRun,
} from "./localActionRuns";

const runs = () => localActionRunStore.getState().runs;

describe("localActionRuns", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLocalActionRuns();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks a run from start to progress", () => {
    const { id } = startLocalActionRun({ key: "delete", title: "Delete" });

    expect(runs()).toHaveLength(1);
    expect(runs()[0].progress).toBeUndefined();

    setLocalActionRunProgress(id, 42);
    expect(runs()[0].progress).toBe(42);
    expect(runs()[0].status).toBe("running");
  });

  it("clears a completed run after the TTL", () => {
    const { id } = startLocalActionRun({ key: "delete", title: "Delete" });
    finishLocalActionRun(id, { status: "completed" });

    expect(runs()[0].status).toBe("completed");
    vi.advanceTimersByTime(7999);
    expect(runs()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(runs()).toHaveLength(0);
  });

  it("keeps a failed run until it is dismissed", () => {
    const { id } = startLocalActionRun({ key: "delete", title: "Delete" });
    finishLocalActionRun(id, { status: "error", error: "boom" });

    vi.advanceTimersByTime(60_000);
    expect(runs()).toHaveLength(1);
    expect(runs()[0].error).toBe("boom");

    dismissLocalActionRun(id);
    expect(runs()).toHaveLength(0);
  });

  it("aborts and removes on cancel", () => {
    const { id, controller } = startLocalActionRun({
      key: "delete",
      title: "Delete",
    });

    cancelLocalActionRun(id);

    expect(controller.signal.aborted).toBe(true);
    expect(runs()).toHaveLength(0);
  });

  it("does not abort on dismiss", () => {
    const { id, controller } = startLocalActionRun({
      key: "delete",
      title: "Delete",
    });

    dismissLocalActionRun(id);

    expect(controller.signal.aborted).toBe(false);
    expect(runs()).toHaveLength(0);
  });

  it("runs different actions concurrently", () => {
    startLocalActionRun({ key: "delete", title: "Delete" });
    startLocalActionRun({ key: "export", title: "Export" });

    expect(runs()).toHaveLength(2);
    expect(selectRunForKey(localActionRunStore.getState(), "delete")?.title).toBe(
      "Delete",
    );
    expect(selectRunForKey(localActionRunStore.getState(), "export")?.title).toBe(
      "Export",
    );
  });

  it("selects the newest running run for a key and ignores finished ones", () => {
    const first = startLocalActionRun({ key: "delete", title: "Delete" });
    const second = startLocalActionRun({ key: "delete", title: "Delete" });

    expect(selectRunForKey(localActionRunStore.getState(), "delete")?.id).toBe(
      second.id,
    );

    finishLocalActionRun(second.id, { status: "error", error: "nope" });
    expect(selectRunForKey(localActionRunStore.getState(), "delete")?.id).toBe(
      first.id,
    );

    finishLocalActionRun(first.id, { status: "error", error: "nope" });
    expect(
      selectRunForKey(localActionRunStore.getState(), "delete"),
    ).toBeUndefined();
  });

  it("evicts the oldest finished run past the cap, never a live one", () => {
    // 20 failures, all kept because nothing dismisses them.
    const failed = Array.from({ length: 20 }, (_, index) => {
      const run = startLocalActionRun({ key: `k${index}`, title: `A${index}` });
      finishLocalActionRun(run.id, { status: "error", error: "x" });
      return run;
    });

    expect(runs()).toHaveLength(20);

    const live = startLocalActionRun({ key: "live", title: "Live" });

    expect(runs()).toHaveLength(20);
    // The oldest failure went, the live run is there.
    expect(runs().some((run) => run.id === failed[0].id)).toBe(false);
    expect(runs().some((run) => run.id === live.id)).toBe(true);
  });

  it("keeps everything when every run is still live", () => {
    for (let index = 0; index < 25; index++) {
      startLocalActionRun({ key: `k${index}`, title: `A${index}` });
    }

    expect(runs()).toHaveLength(25);
  });
});
