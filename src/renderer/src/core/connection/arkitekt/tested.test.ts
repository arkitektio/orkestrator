import { describe, expect, it } from "vitest";
import { wanted } from "./tested";

describe("wanted", () => {
  it("is the tested minor within its major, and nothing without a stamp", () => {
    expect(wanted("22.7.0")).toBe(">=22.7,<23");
    expect(wanted(undefined)).toBeUndefined();
  });
});
