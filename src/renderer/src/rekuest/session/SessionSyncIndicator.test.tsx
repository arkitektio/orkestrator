// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSync } from "./client";

/** The session's sync, driven by the test. */
const store = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let sync = { status: "open", since: null, catchingUp: false, error: null } as SessionSync;
  return {
    session: {
      getSync: () => sync,
      subscribeStatus: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    set(next: SessionSync) {
      sync = next;
      for (const listener of [...listeners]) listener();
    },
  };
});
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("./hooks", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useRekuestSession: () => store.session,
    useRekuestSessionSync: (session: typeof store.session) =>
      useSyncExternalStore(session.subscribeStatus, session.getSync),
  };
});

import { SessionSyncIndicator } from "./SessionSyncIndicator";

const indicator = () => screen.queryByTestId("rekuest-sync-indicator");

describe("SessionSyncIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.set({ status: "open", since: null, catchingUp: false, error: null });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("says nothing while updates flow", () => {
    render(<SessionSyncIndicator />);
    act(() => void vi.advanceTimersByTime(60_000));
    expect(indicator()).toBeNull();
  });

  it("says nothing of a blip, and that it reconnects once it lasts", () => {
    render(<SessionSyncIndicator />);
    act(() => store.set({ status: "reconnecting", since: Date.now(), catchingUp: false, error: null }));
    act(() => void vi.advanceTimersByTime(1_000));
    expect(indicator()).toBeNull();
    act(() => void vi.advanceTimersByTime(1_500));
    expect(indicator()?.dataset.sync).toBe("reconnecting");
    expect(indicator()?.title).toMatch(/paused for 2 s/);
    act(() => store.set({ status: "open", since: null, catchingUp: false, error: null }));
    expect(indicator()).toBeNull();
  });

  it("is yellow, and says on hover what went wrong", () => {
    render(<SessionSyncIndicator />);
    act(() =>
      store.set({
        status: "reconnecting",
        since: Date.now(),
        catchingUp: false,
        error: { message: "The server refused this window's sign-in.", detail: "Close code 4401", at: Date.now() },
      }),
    );
    act(() => void vi.advanceTimersByTime(2_000));
    expect(indicator()?.querySelector("svg")?.getAttribute("class")).toMatch(/text-warning/);
    expect(indicator()?.title).toMatch(/Why: The server refused this window's sign-in\.\nClose code 4401\n/);
  });

  it("takes you to the connection status, and opens nothing else", () => {
    const outer = vi.fn();
    render(
      <div onPointerDown={outer} onClick={outer}>
        <SessionSyncIndicator />
      </div>,
    );
    act(() => store.set({ status: "reconnecting", since: Date.now(), catchingUp: false, error: null }));
    act(() => void vi.advanceTimersByTime(2_000));
    fireEvent.pointerDown(indicator()!);
    fireEvent.click(indicator()!);
    expect(navigate).toHaveBeenCalledWith("/settings/connection");
    expect(outer).not.toHaveBeenCalled();
  });

  it("says it catches up after a new session, until it has", () => {
    render(<SessionSyncIndicator />);
    act(() => store.set({ status: "open", since: null, catchingUp: true, error: null }));
    act(() => void vi.advanceTimersByTime(1_000));
    expect(indicator()?.dataset.sync).toBe("catching_up");
    act(() => store.set({ status: "open", since: null, catchingUp: false, error: null }));
    expect(indicator()).toBeNull();
  });
});
