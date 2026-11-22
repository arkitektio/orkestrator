import { describe, expect, it } from "vitest";
import { RunStatus } from "@/fluss/api/graphql";
import { activeRunChange } from "./runEvents";

const listed = [{ id: "1" }, { id: "2" }];

describe("activeRunChange", () => {
  it("drops a listed run that stops running or is deleted", () => {
    expect(activeRunChange(listed, { update: { id: "1", status: RunStatus.Completed } })).toEqual({ kind: "remove", id: "1" });
    expect(activeRunChange(listed, { delete: "2" })).toEqual({ kind: "remove", id: "2" });
  });

  it("re-reads only for a running run it does not list yet", () => {
    expect(activeRunChange(listed, { create: { id: "3", status: RunStatus.Running } })).toEqual({ kind: "refetch" });
    expect(activeRunChange(listed, { update: { id: "1", status: RunStatus.Running } })).toEqual({ kind: "none" });
  });

  it("ignores runs it never listed that are not running", () => {
    expect(activeRunChange(listed, { update: { id: "9", status: RunStatus.Completed } })).toEqual({ kind: "none" });
    expect(activeRunChange(listed, { delete: "9" })).toEqual({ kind: "none" });
    expect(activeRunChange(listed, undefined)).toEqual({ kind: "none" });
  });
});
