// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastError = vi.fn();
vi.mock("@/core/notify", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

// The window's session, and the client the assigned task is read with.
const call = vi.fn();
const apolloQuery = vi.fn();
vi.mock("../session/hooks", () => ({ useRekuestSession: () => ({ call }) }));
vi.mock("../api/hooks", () => ({ useRekuest: () => ({ query: apolloQuery }) }));
vi.mock("../lib/taskCache", async (original) => ({
  ...(await original<typeof import("../lib/taskCache")>()),
  hydrateAndInsertMyTask: vi.fn(() => Promise.resolve(undefined)),
}));

import { SessionRefusal } from "../session/client";
import { AssignError } from "../lib/assignError";
import { useAssign } from "./useAssign";

describe("useAssign", () => {
  beforeEach(() => {
    toastError.mockClear();
    call.mockReset();
    apolloQuery.mockReset();
  });

  it("assigns over the window's session, and reads the task once", async () => {
    call.mockResolvedValue({
      type: "ASSIGNED",
      request: "r",
      reference: "ref",
      task: "42",
      created: true,
      record: null,
    });
    apolloQuery.mockResolvedValue({ data: { task: { id: "42", reference: "ref" } } });
    const { result } = renderHook(() => useAssign());

    const task = await result.current.assign({
      action: "7",
      args: { myPort: 1 },
      reference: "ref",
      deadman: 60,
    });

    expect(call).toHaveBeenCalledWith({
      type: "ASSIGN",
      input: { action: "7", args: { myPort: 1 }, hooks: [], reference: "ref" },
      deadman: 60,
    });
    expect(apolloQuery).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: "42" } }));
    expect(task).toEqual({ id: "42", reference: "ref" });
  });

  it("throws one readable error for a refusal and shows nothing itself", async () => {
    call.mockRejectedValue(new SessionRefusal("No implementation of this action can run it."));
    const { result } = renderHook(() => useAssign());

    const error = await result.current.assign({ action: "7", args: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AssignError);
    expect((error as AssignError).message).toContain("No implementation");
    expect(toastError).not.toHaveBeenCalled();
    expect(apolloQuery).not.toHaveBeenCalled();
  });
});
