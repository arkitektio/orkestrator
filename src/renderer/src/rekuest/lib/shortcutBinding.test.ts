import { describe, expect, it } from "vitest";
import { describeBinding, EMPTY_BINDING, toBindingInput } from "./shortcutBinding";

describe("shortcut binding rules", () => {
  it("sends an empty rule as every member, everywhere", () => {
    expect(toBindingInput(EMPTY_BINDING)).toEqual({ users: null, app: null, client: null, device: null });
    expect(describeBinding(EMPTY_BINDING)).toBe("Pinned for everyone in the organization, wherever they work.");
  });

  it("keeps each dimension that is set, and drops empty strings", () => {
    const values = { users: ["1", "2"], app: "orkestrator", client: "", device: "node-1" };
    expect(toBindingInput(values)).toEqual({ users: ["1", "2"], app: "orkestrator", client: null, device: "node-1" });
    expect(describeBinding(values)).toBe("Pinned for 2 members, in orkestrator, on the chosen device.");
  });

  it("names one member", () => {
    expect(describeBinding({ users: ["1"], client: "abc" })).toBe("Pinned for 1 member, on the chosen client.");
  });
});
