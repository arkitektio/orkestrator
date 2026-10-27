import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalKind } from "@/rekuest/api/graphql";
import { createCheckScheduler, type ServerAnswer, type ServerCheck } from "./useServerCheck";

describe("createCheckScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("checks once, after the draft stops changing", async () => {
    const run = vi.fn(async () => ({ diagnostics: [], resolvedLocals: [{ key: "on", kind: LocalKind.Bool, nullable: false, persist: false }] }));
    const results: ServerCheck[] = [];
    const scheduler = createCheckScheduler(run, (check) => results.push(check), 1000);
    scheduler.schedule("a");
    vi.advanceTimersByTime(500);
    scheduler.schedule("ab");
    vi.advanceTimersByTime(999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledExactlyOnceWith("ab");
    expect(results.map((check) => check.status)).toEqual(["checking", "ok"]);
    // An answer names the draft it is for, with the locals as the server resolves them.
    expect(results[1]).toEqual({ status: "ok", checked: '"ab"', resolvedLocals: [{ key: "on", kind: LocalKind.Bool, nullable: false, persist: false }] });
  });

  it("drops a slow answer to an older draft", async () => {
    let resolveFirst: (value: ServerAnswer) => void = () => {};
    const run = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(async () => ({ diagnostics: [], resolvedLocals: [] }));
    const results: ServerCheck[] = [];
    const scheduler = createCheckScheduler(run, (check) => results.push(check), 100);
    scheduler.schedule("old");
    await vi.advanceTimersByTimeAsync(100);
    scheduler.schedule("new");
    await vi.advanceTimersByTimeAsync(100);
    resolveFirst({ diagnostics: [{ code: "x", message: "stale" }], resolvedLocals: [] });
    await vi.runAllTimersAsync();
    expect(results.at(-1)).toEqual({ status: "ok", checked: '"new"', resolvedLocals: [] });
    expect(results.some((check) => check.status === "warnings")).toBe(false);
  });

  it("reports a refusal, and nothing for no draft", async () => {
    const results: ServerCheck[] = [];
    const scheduler = createCheckScheduler(async () => Promise.reject(new Error("no")), (check) => results.push(check), 10);
    scheduler.schedule(null);
    expect(results).toEqual([{ status: "idle" }]);
    scheduler.schedule("x");
    await vi.advanceTimersByTimeAsync(10);
    expect(results.at(-1)).toMatchObject({ status: "refused" });
  });
});
