// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { consumePendingShare, rememberPendingShare } from "./pendingShare";

describe("pendingShare", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("hands the remembered path back across the switch", () => {
    rememberPendingShare("/mikro/images/5");
    expect(consumePendingShare()).toBe("/mikro/images/5");
  });

  it("applies to exactly one switch, never the next", () => {
    rememberPendingShare("/mikro/images/5");
    consumePendingShare();
    // An ordinary switch afterwards must still boot on its own tabs.
    expect(consumePendingShare()).toBeNull();
  });

  it("is null when nothing was remembered", () => {
    expect(consumePendingShare()).toBeNull();
  });

  it("does not outlive the window", () => {
    rememberPendingShare("/mikro/images/5");
    expect(window.localStorage.getItem("arkitektPendingShare")).toBeNull();
  });

  it("switches anyway when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberPendingShare("/mikro/images/5")).not.toThrow();
  });

  it("reads as nothing pending when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(consumePendingShare()).toBeNull();
  });
});
