// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { announceAuthUpdate } from "./announce";
import type { AuthFinish, AuthSession, AuthUpdate } from "./types";
import { useAuthSession } from "./useAuthSession";

const complete = vi.fn();
const read = vi.fn();
const cancel = vi.fn();
const driver = { complete, read, cancel };

const session = (finish: AuthFinish): AuthSession => ({
  state: "s-1",
  status: "PENDING",
  finish,
  openUrl: "https://provider.test/login",
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  interval: finish === "POLL" ? 5 : null,
  userCode: finish === "POLL" ? "ABCD" : null,
  redirectUrl: finish === "REDIRECT" ? "https://coord.test/auth/callback/bank" : null,
});

const pending = (step: string | null = null): AuthUpdate => ({ status: "PENDING", step });
const done: AuthUpdate = { status: "DONE", result: { identifier: "@bank/connection", id: "4" } };

// One interval per act: the next step is armed when the render settles.
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const started = async (finish: AuthFinish, withDriver = driver) => {
  const open = vi.fn().mockResolvedValue(session(finish));
  const hook = renderHook(() => useAuthSession({ open, driver: withDriver }));
  await act(async () => {
    await hook.result.current.begin();
  });
  return hook;
};

describe("useAuthSession", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("POLL: one complete call per interval until DONE, then stops", async () => {
    vi.useFakeTimers();
    complete.mockResolvedValueOnce(pending()).mockResolvedValueOnce(pending("MFA")).mockResolvedValueOnce(done);
    const { result } = await started("POLL");

    await tick(4_900);
    expect(complete).not.toHaveBeenCalled();
    await tick(200);
    expect(complete).toHaveBeenLastCalledWith({ state: "s-1" });
    await tick(5_000);
    expect(result.current.phase).toEqual({ kind: "step", step: "MFA" });
    await tick(5_000);
    expect(result.current.phase).toEqual({ kind: "done" });
    expect(result.current.session?.result?.id).toBe("4");
    for (let i = 0; i < 4; i++) await tick(5_100);
    expect(complete).toHaveBeenCalledTimes(3);
    expect(read).not.toHaveBeenCalled();
  });

  it("REDIRECT: re-reads the session (never completes it) until it is DONE", async () => {
    vi.useFakeTimers();
    read.mockResolvedValueOnce(pending()).mockResolvedValueOnce(done);
    const { result } = await started("REDIRECT");

    await tick(3_100);
    expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ state: "s-1" }));
    expect(result.current.phase).toEqual({ kind: "approve" });
    await tick(3_100);
    expect(result.current.phase).toEqual({ kind: "done" });
    for (let i = 0; i < 3; i++) await tick(3_100);
    expect(read).toHaveBeenCalledTimes(2);
    expect(complete).not.toHaveBeenCalled();
  });

  it("REDIRECT: finishes the moment the callback page announces it, without a read", async () => {
    vi.useFakeTimers();
    const { result } = await started("REDIRECT", { complete, cancel } as typeof driver);
    act(() => announceAuthUpdate("s-1", done));
    expect(result.current.phase).toEqual({ kind: "done" });
    // Another login's news is not ours.
    act(() => announceAuthUpdate("s-2", { status: "FAILED" }));
    expect(result.current.phase).toEqual({ kind: "done" });
    await tick(10_000);
    expect(read).not.toHaveBeenCalled();
  });

  it("REDIRECT fallback: a pasted redirect completes the login directly", async () => {
    complete.mockResolvedValue(done);
    const { result } = await started("REDIRECT");
    await act(async () => {
      await result.current.completeRedirect("c-1", "s-1");
    });
    expect(complete).toHaveBeenCalledWith({ state: "s-1", code: "c-1" });
    expect(result.current.phase).toEqual({ kind: "done" });
  });

  it("retries through errors, pauses after three in a row, and resumes", async () => {
    vi.useFakeTimers();
    complete.mockRejectedValue(new Error("network down"));
    const { result } = await started("POLL");

    await tick(5_100);
    await tick(5_100);
    expect(result.current.paused).toBe(false);
    await tick(5_100);
    expect(complete).toHaveBeenCalledTimes(3);
    expect(result.current.paused).toBe(true);
    for (let i = 0; i < 4; i++) await tick(5_100);
    expect(complete).toHaveBeenCalledTimes(3);

    complete.mockResolvedValue(done);
    act(() => result.current.resume());
    await tick(5_100);
    expect(result.current.phase).toEqual({ kind: "done" });
  });

  it("cancel drops an open login on the server, but not a finished one", async () => {
    cancel.mockResolvedValue(undefined);
    const open = await started("REDIRECT");
    act(() => open.result.current.cancel());
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(open.result.current.session).toBeNull();

    const finished = await started("REDIRECT");
    act(() => announceAuthUpdate("s-1", done));
    act(() => finished.result.current.cancel());
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("reports a session that could not be opened", async () => {
    const open = vi.fn().mockRejectedValue(new Error("NOT_CONFIGURED"));
    const { result } = renderHook(() => useAuthSession({ open, driver }));
    await act(async () => {
      await result.current.begin();
    });
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
