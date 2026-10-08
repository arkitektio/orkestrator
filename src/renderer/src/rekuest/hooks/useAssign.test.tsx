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

import { AssignError } from "../lib/assignError";
import { useAssign } from "./useAssign";

describe("useAssign", () => {
  beforeEach(() => {
    toastError.mockClear();
    postAssign.mockReset();
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
