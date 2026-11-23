// @vitest-environment jsdom
import { ApolloError } from "@apollo/client";
import { renderHook } from "@testing-library/react";
import { GraphQLError } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastError = vi.fn();
vi.mock("@/core/notify", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

const postAssign = vi.fn();
const assignOptions = vi.fn();
vi.mock("../api/graphql", async (original) => ({
  // The task tracker reads the generated enums.
  ...(await original<typeof import("../api/graphql")>()),
  useAssignMutation: (options: unknown) => {
    assignOptions(options);
    return [postAssign];
  },
  useCancelMutation: () => [vi.fn()],
}));

// The window's session: none (the mutation path), unless a test gives one.
const session = vi.hoisted(() => ({ current: null as unknown }));
const apolloQuery = vi.fn();
vi.mock("../session/hooks", async (original) => ({
  ...(await original<typeof import("../session/hooks")>()),
  useRekuestSession: () => session.current,
}));
vi.mock("../api/hooks", () => ({ useRekuest: () => ({ query: apolloQuery }) }));
vi.mock("../lib/taskCache", async (original) => ({
  ...(await original<typeof import("../lib/taskCache")>()),
  hydrateAndInsertMyTask: vi.fn(() => Promise.resolve(undefined)),
}));

import { AssignError } from "../lib/assignError";
import { useAssign } from "./useAssign";

describe("useAssign", () => {
  beforeEach(() => {
    toastError.mockClear();
    postAssign.mockReset();
    apolloQuery.mockReset();
    session.current = null;
  });

  it("assigns over the window's session while there is one, and reads the task once", async () => {
    const call = vi.fn(() =>
      Promise.resolve({ type: "ASSIGNED", request: "r", reference: "ref", task: "42", created: true, record: null }),
    );
    session.current = { getStatus: () => "open", call };
    apolloQuery.mockResolvedValue({ data: { task: { id: "42", reference: "ref" } } });
    const { result } = renderHook(() => useAssign());

    const task = await result.current.assign({ action: "7", args: { myPort: 1 }, reference: "ref", deadman: 60 });

    expect(call).toHaveBeenCalledWith({
      type: "ASSIGN",
      input: { action: "7", args: { myPort: 1 }, hooks: [], reference: "ref" },
      deadman: 60,
    });
    expect(postAssign).not.toHaveBeenCalled();
    expect(apolloQuery).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: "42" } }));
    expect(task).toEqual({ id: "42", reference: "ref" });
  });

  it("takes the failure over from the service-wide toast", () => {
    renderHook(() => useAssign());

    // Its own `onError` is what keeps `rekuest/api/hooks` from toasting.
    expect(assignOptions).toHaveBeenCalledWith(expect.objectContaining({ onError: expect.any(Function) }));
  });

  it("throws one readable error and shows nothing itself", async () => {
    // What Apollo resolves with when the mutation has an `onError`.
    postAssign.mockResolvedValue({
      data: undefined,
      errors: new ApolloError({ graphQLErrors: [new GraphQLError("Agent stage-1 is not connected", { path: ["assign"] })] }),
    });
    const { result } = renderHook(() => useAssign());

    const failure = await result.current.assign({ args: {}, capture: false }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AssignError);
    expect((failure as AssignError).message).toBe("Agent stage-1 is not connected");
    expect(toastError).not.toHaveBeenCalled();
  });
});
