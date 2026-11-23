import { describe, expect, it } from "vitest";
import { saidByTask } from "./taskMessage";

describe("saidByTask", () => {
  it("is the server's latest message", () => {
    expect(saidByTask({ latestMessage: "Storing the frame", events: [{ message: "older" }] })).toBe("Storing the frame");
  });

  it("falls back to the newest event that said something", () => {
    expect(saidByTask({ latestMessage: null, events: [{ message: null }, { message: "Slice 3" }] })).toBe("Slice 3");
  });

  it("skips the line the agent runtime writes before the action runs", () => {
    expect(saidByTask({ latestMessage: "Queued for running" })).toBeUndefined();
    expect(saidByTask({ events: [{ message: "Queued for running" }] })).toBeUndefined();
  });
});
