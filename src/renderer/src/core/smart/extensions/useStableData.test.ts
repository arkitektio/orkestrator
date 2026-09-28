import { describe, expect, it } from "vitest";
import { deriveStableData } from "./useStableData";

const rows = { actions: [{ id: "a" }] };
const older = { actions: [{ id: "old" }] };

describe("deriveStableData", () => {
  it("is loading with nothing to show", () => {
    expect(deriveStableData({ data: undefined, previousData: undefined, loading: true, error: undefined })).toEqual({
      data: undefined,
      stale: false,
      status: "loading",
    });
  });

  it("shows the previous rows while new variables are in flight", () => {
    expect(deriveStableData({ data: undefined, previousData: older, loading: true, error: undefined })).toEqual({
      data: older,
      stale: true,
      status: "revalidating",
    });
  });

  it("is ready with data, including during a background refetch", () => {
    expect(deriveStableData({ data: rows, previousData: older, loading: true, error: undefined })).toEqual({
      data: rows,
      stale: false,
      status: "ready",
    });
    expect(deriveStableData({ data: rows, previousData: undefined, loading: false, error: undefined }).status).toBe("ready");
  });

  it("is ready when not loading and nothing came back", () => {
    expect(deriveStableData({ data: undefined, previousData: undefined, loading: false, error: undefined }).status).toBe("ready");
  });

  it("keeps stale rows next to an error", () => {
    const error = new Error("nope") as never;
    expect(deriveStableData({ data: undefined, previousData: older, loading: false, error })).toMatchObject({
      data: older,
      stale: true,
      status: "error",
      error,
    });
  });

  it("is ready and empty when skipped", () => {
    expect(deriveStableData({ data: rows, previousData: undefined, loading: true, error: undefined }, true)).toEqual({
      data: undefined,
      stale: false,
      status: "ready",
    });
  });
});
