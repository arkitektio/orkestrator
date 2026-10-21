import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckScheduler, type ServerCheck } from "./useServerCheck";

describe("createCheckScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("checks once, after the draft stops changing", async () => {
    const run = vi.fn(async () => []);
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
  });

  it("drops a slow answer to an older draft", async () => {
    let resolveFirst: (value: { code: string; message: string }[]) => void = () => {};
    const run = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(async () => []);
    const results: ServerCheck[] = [];
    const scheduler = createCheckScheduler(run, (check) => results.push(check), 100);
    scheduler.schedule("old");
    await vi.advanceTimersByTimeAsync(100);
    scheduler.schedule("new");
    await vi.advanceTimersByTimeAsync(100);
    resolveFirst([{ code: "x", message: "stale" }]);
    await vi.runAllTimersAsync();
    expect(results.at(-1)).toEqual({ status: "ok" });
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
