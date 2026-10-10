import { describe, expect, it, vi } from "vitest";
import { contractAuthFlow, sessionOf } from "./contract";

const doc = (name: string) => ({ kind: "Document", definitions: [], name }) as never;
const wire = {
  state: "s-1",
  status: "PENDING",
  finish: "POLL",
  openUrl: "https://provider/login",
  expiresAt: "2026-10-10T12:00:00Z",
  interval: 5,
  userCode: "AB-12",
  step: null,
  result: null,
};

const flow = contractAuthFlow({
  service: "bank",
  title: "Bank login",
  documents: { complete: doc("complete"), read: doc("read"), cancel: doc("cancel") },
  refetchOnDone: [doc("list")],
});

describe("contractAuthFlow", () => {
  it("maps a started session field for field", () => {
    expect(sessionOf(wire)).toMatchObject({ state: "s-1", status: "PENDING", finish: "POLL", interval: 5, userCode: "AB-12" });
  });

  it("completes by state and refetches the lists only once the login is done", async () => {
    const mutate = vi.fn(async (options: { refetchQueries: (r: unknown) => unknown[] }) => {
      const step = { data: { completeAuth: { ...wire, step: "MFA" } } };
      expect(options.refetchQueries(step)).toEqual([]);
      const done = { data: { completeAuth: { ...wire, status: "DONE", result: { identifier: "@bank/connection", id: "4" } } } };
      expect(options.refetchQueries(done)).toHaveLength(1);
      return done;
    });
    const update = await flow.complete({ mutate } as never, { state: "s-1", code: "c-1" });
    expect(mutate.mock.calls[0][0]).toMatchObject({ variables: { input: { state: "s-1", code: "c-1" } } });
    expect(update).toEqual({
      status: "DONE",
      step: null,
      errorCode: undefined,
      errorMessage: undefined,
      result: { identifier: "@bank/connection", id: "4", label: undefined },
    });
  });

  it("reads and cancels by state", async () => {
    const query = vi.fn(async () => ({ data: { authSession: { ...wire, status: "EXPIRED" } } }));
    const mutate = vi.fn(async () => ({ data: {} }));
    const session = sessionOf(wire);
    expect((await flow.read!({ query } as never, session))?.status).toBe("EXPIRED");
    await flow.cancel!({ mutate } as never, session);
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { state: "s-1" } }));
  });
});
