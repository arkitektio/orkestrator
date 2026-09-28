import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sonner = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), message: vi.fn(), dismiss: vi.fn() }));
vi.mock("sonner", () => ({ toast: sonner }));

import { toast } from "./index";
import {
  MAX_TOASTS,
  dismissToast,
  mountToastIsland,
  pauseToasts,
  pushToast,
  resetToasts,
  resumeToasts,
  toastStore,
} from "./toasts";

const ids = () => toastStore.getState().toasts.map((t) => t.id);

beforeEach(() => {
  vi.useFakeTimers();
  resetToasts();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe("toast store", () => {
  it("clears a success after its time and keeps an error until dismissed", () => {
    pushToast("success", "Sent", { id: "ok" });
    pushToast("error", "Failed", { id: "bad" });
    vi.advanceTimersByTime(5000);
    expect(ids()).toEqual(["bad"]);
    vi.advanceTimersByTime(60_000);
    expect(ids()).toEqual(["bad"]);
    dismissToast("bad");
    expect(ids()).toEqual([]);
  });

  it("lets duration win, Infinity included", () => {
    pushToast("success", "a", { id: "short", duration: 100 });
    pushToast("info", "b", { id: "stay", duration: Infinity });
    vi.advanceTimersByTime(100);
    expect(ids()).toEqual(["stay"]);
    vi.advanceTimersByTime(60_000);
    expect(ids()).toEqual(["stay"]);
  });

  it("replaces a toast with the same id in place, and restarts its time", () => {
    pushToast("info", "Syncing", { id: "sync" });
    pushToast("success", "Other", { id: "other" });
    vi.advanceTimersByTime(4000);
    pushToast("success", "Synced", { id: "sync", description: "12 new" });
    expect(toastStore.getState().toasts.map((t) => [t.id, t.message])).toEqual([
      ["sync", "Synced"],
      ["other", "Other"],
    ]);
    vi.advanceTimersByTime(1000);
    expect(ids()).toEqual(["sync"]);
  });

  it("caps the list, dropping the oldest that is not an error", () => {
    pushToast("error", "e", { id: "e" });
    for (let i = 0; i < MAX_TOASTS; i++) pushToast("success", `s${i}`, { id: `s${i}` });
    expect(ids()).toHaveLength(MAX_TOASTS);
    expect(ids()).toContain("e");
    expect(ids()).not.toContain("s0");
  });

  it("holds expiries while paused, and runs out the rest after", () => {
    pushToast("success", "a", { id: "a" });
    vi.advanceTimersByTime(3000);
    pauseToasts();
    vi.advanceTimersByTime(10_000);
    expect(ids()).toEqual(["a"]);
    resumeToasts();
    vi.advanceTimersByTime(1999);
    expect(ids()).toEqual(["a"]);
    vi.advanceTimersByTime(1);
    expect(ids()).toEqual([]);
  });
});

describe("toast facade", () => {
  it("falls back to sonner when no island is mounted", () => {
    toast.error("Nope", { description: "x" });
    expect(sonner.error).toHaveBeenCalledWith("Nope", { description: "x" });
    expect(ids()).toEqual([]);
  });

  it("goes to the island once one is mounted, and back when it leaves", () => {
    const unmount = mountToastIsland();
    toast.success("Sent", { id: "s" });
    toast("Plain", { id: "p" });
    expect(sonner.success).not.toHaveBeenCalled();
    expect(toastStore.getState().toasts.map((t) => [t.id, t.kind])).toEqual([
      ["s", "success"],
      ["p", "default"],
    ]);
    unmount();
    toast.info("Later");
    expect(sonner.info).toHaveBeenCalledWith("Later", undefined);
  });
});
