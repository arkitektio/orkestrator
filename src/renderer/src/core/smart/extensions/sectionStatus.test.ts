import { describe, expect, it, vi } from "vitest";
import { createSectionStatusStore, isEmptyResult, summarize } from "./sectionStatus";

describe("summarize", () => {
  it("treats an expected section with no entry as pending", () => {
    const store = createSectionStatusStore();
    store.report("local.actions", { status: "ready", count: 2, revision: 1 });
    const summary = summarize(store.getSnapshot(), ["local.actions", "rekuest.actions"]);
    expect(summary.pending).toBe(true);
    expect(summary.total).toBe(2);
    expect(isEmptyResult(summary)).toBe(false);
  });

  it("is pending while any section loads or revalidates, even with rows", () => {
    const store = createSectionStatusStore();
    store.report("local.actions", { status: "ready", count: 0, revision: 0 });
    store.report("rekuest.actions", { status: "revalidating", count: 3, revision: 2 });
    const summary = summarize(store.getSnapshot(), ["local.actions", "rekuest.actions"]);
    expect(summary).toMatchObject({ pending: true, settled: false, total: 3, revision: 2 });
  });

  it("counts skipped as settled and reports empty only when everything settled at zero", () => {
    const store = createSectionStatusStore();
    store.report("local.actions", { status: "ready", count: 0, revision: 0 });
    store.report("rekuest.actions", { status: "skipped", count: 0, revision: 0 });
    const summary = summarize(store.getSnapshot(), ["local.actions", "rekuest.actions"]);
    expect(summary.settled).toBe(true);
    expect(isEmptyResult(summary)).toBe(true);
  });

  it("an error blocks the empty state", () => {
    const store = createSectionStatusStore();
    store.report("rekuest.actions", { status: "error", count: 0, revision: 0 });
    const summary = summarize(store.getSnapshot(), ["rekuest.actions"]);
    expect(summary.settled).toBe(true);
    expect(summary.error).toBe(true);
    expect(isEmptyResult(summary)).toBe(false);
  });

  it("ignores entries that are not expected", () => {
    const store = createSectionStatusStore();
    store.report("kraph.measurements", { status: "loading", count: 0, revision: 0 });
    expect(summarize(store.getSnapshot(), []).pending).toBe(false);
  });
});

describe("createSectionStatusStore", () => {
  it("emits a new snapshot on change and nothing on an equal report", () => {
    const store = createSectionStatusStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    store.report("rekuest.actions", { status: "ready", count: 1, revision: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);
    store.report("rekuest.actions", { status: "ready", count: 1, revision: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    store.remove("rekuest.actions");
    expect(listener).toHaveBeenCalledTimes(2);
    store.remove("rekuest.actions");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
