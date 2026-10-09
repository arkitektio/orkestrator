import { describe, expect, it, vi } from "vitest";

vi.mock("@/lovekit/api/graphql", () => ({ AddToCallDocument: { kind: "Document" } }));

import { addToCall } from "./addToCall";

const client = (answer: unknown = { data: { addToCall: { id: "7" } } }) => {
  const mutate = vi.fn().mockResolvedValue(answer);
  return { mutate, asClient: { mutate } as never };
};

describe("addToCall", () => {
  it("adds what was dropped to the call, by its numeric id", async () => {
    const { mutate, asClient } = client();
    await addToCall(asClient, { id: "7" }, [
      { identifier: "@mikro/image", id: "42" },
      { identifier: "@kraph/entity", id: 3 },
    ]);
    expect(mutate.mock.calls[0][0].variables).toEqual({
      input: {
        call: "7",
        about: [
          { identifier: "@mikro/image", object: 42 },
          { identifier: "@kraph/entity", object: 3 },
        ],
      },
    });
  });

  it("leaves out calls and what has no numeric id", async () => {
    const { mutate, asClient } = client();
    await addToCall(asClient, { id: "7" }, [
      { identifier: "@lovekit/call", id: "8" },
      { identifier: "@kraph/graph", id: "not-a-number" },
      { identifier: "@mikro/image", id: "42" },
    ]);
    expect(mutate.mock.calls[0][0].variables.input.about).toEqual([{ identifier: "@mikro/image", object: 42 }]);
  });

  it("refuses when nothing dropped can be a topic", async () => {
    const { mutate, asClient } = client();
    await expect(addToCall(asClient, { id: "7" }, [{ identifier: "@lovekit/call", id: "8" }])).rejects.toThrow(
      "That cannot be added to a call",
    );
    expect(mutate).not.toHaveBeenCalled();
  });
});
