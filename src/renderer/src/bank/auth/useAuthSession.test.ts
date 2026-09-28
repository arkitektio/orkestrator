// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const completePoll = vi.fn();
const completeRedirect = vi.fn();
const readConnection = vi.fn();

vi.mock("../api/graphql", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/graphql")>();
  return {
    ...actual,
    useCompleteScalableLinkMutation: () => [completePoll],
    useCompleteBankLinkMutation: () => [completeRedirect, { loading: false }],
    useGetBankConnectionLazyQuery: () => [readConnection],
  };
});

import { AuthFinish, AuthSessionFragment, ConnectionStatus, LinkStep } from "../api/graphql";
import { useAuthSession } from "./useAuthSession";

const session = (finish: AuthFinish): AuthSessionFragment =>
  ({
    state: "s-1",
    openUrl: "https://provider.test/login",
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    finish,
    interval: finish === AuthFinish.Poll ? 5 : null,
    userCode: finish === AuthFinish.Poll ? "ABCD" : null,
    redirectUrl: finish === AuthFinish.Redirect ? "https://coord.test/auth/callback/bank" : null,
    connection: { id: "4", status: ConnectionStatus.Pending, linkStep: null },
  }) as unknown as AuthSessionFragment;

const conn = (status: ConnectionStatus, linkStep: LinkStep | null = null) => ({
  id: "4",
  status,
  linkStep,
  lastError: null,
  accounts: [],
});

// One interval per act: the next step is armed when the render settles.
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const started = async (finish: AuthFinish) => {
  const open = vi.fn().mockResolvedValue(session(finish));
  const hook = renderHook(() => useAuthSession({ open }));
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

  it("POLL: one complete call per interval until ACTIVE, then stops", async () => {
    vi.useFakeTimers();
    completePoll
      .mockResolvedValueOnce({ data: { completeScalableLink: conn(ConnectionStatus.Pending, LinkStep.Device) } })
      .mockResolvedValueOnce({ data: { completeScalableLink: conn(ConnectionStatus.Pending, LinkStep.Mfa) } })
      .mockResolvedValueOnce({ data: { completeScalableLink: conn(ConnectionStatus.Active, LinkStep.Done) } });
    const { result } = await started(AuthFinish.Poll);

    await tick(4_900);
    expect(completePoll).not.toHaveBeenCalled();
    await tick(200);
    expect(completePoll).toHaveBeenLastCalledWith({ variables: { state: "s-1" } });
    await tick(5_000);
    expect(result.current.phase).toEqual({ kind: "mfa" });
    await tick(5_000);
    expect(result.current.phase).toEqual({ kind: "active" });
    for (let i = 0; i < 4; i++) await tick(5_100);
    expect(completePoll).toHaveBeenCalledTimes(3);
    expect(readConnection).not.toHaveBeenCalled();
  });

  it("REDIRECT: re-reads the connection (never completes it) until the callback made it ACTIVE", async () => {
    vi.useFakeTimers();
    readConnection
      .mockResolvedValueOnce({ data: { bankConnection: conn(ConnectionStatus.Pending) } })
      .mockResolvedValueOnce({ data: { bankConnection: conn(ConnectionStatus.Active) } });
    const { result } = await started(AuthFinish.Redirect);

    await tick(3_100);
    expect(readConnection).toHaveBeenLastCalledWith({ variables: { id: "4" } });
    expect(result.current.phase).toEqual({ kind: "approve" });
    await tick(3_100);
    expect(result.current.phase).toEqual({ kind: "active" });
    for (let i = 0; i < 3; i++) await tick(3_100);
    expect(readConnection).toHaveBeenCalledTimes(2);
    expect(completePoll).not.toHaveBeenCalled();
  });

  it("REDIRECT fallback: a pasted redirect completes the link directly", async () => {
    completeRedirect.mockResolvedValue({ data: { completeBankLink: conn(ConnectionStatus.Active) } });
    const { result } = await started(AuthFinish.Redirect);
    await act(async () => {
      await result.current.completeRedirect("c-1", "s-1");
    });
    expect(completeRedirect).toHaveBeenCalledWith({ variables: { input: { code: "c-1", state: "s-1" } } });
    expect(result.current.phase).toEqual({ kind: "active" });
  });

  it("retries through errors, pauses after three in a row, and resumes", async () => {
    vi.useFakeTimers();
    completePoll.mockRejectedValue(new Error("network down"));
    const { result } = await started(AuthFinish.Poll);

    await tick(5_100);
    await tick(5_100);
    expect(result.current.paused).toBe(false);
    await tick(5_100);
    expect(completePoll).toHaveBeenCalledTimes(3);
    expect(result.current.paused).toBe(true);
    for (let i = 0; i < 4; i++) await tick(5_100);
    expect(completePoll).toHaveBeenCalledTimes(3);

    completePoll.mockResolvedValue({ data: { completeScalableLink: conn(ConnectionStatus.Active, LinkStep.Done) } });
    act(() => result.current.resume());
    await tick(5_100);
    expect(result.current.phase).toEqual({ kind: "active" });
  });

  it("reports a session that could not be opened", async () => {
    const open = vi.fn().mockRejectedValue(new Error("NOT_CONFIGURED"));
    const { result } = renderHook(() => useAuthSession({ open }));
    await act(async () => {
      await result.current.begin();
    });
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
