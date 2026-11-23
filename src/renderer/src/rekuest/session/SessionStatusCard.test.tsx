// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionError, SessionSync } from "./client";

const state = vi.hoisted(() => ({
  sync: null as unknown as SessionSync,
  last: null as SessionError | null,
}));
const session = vi.hoisted(() => ({
  subscribeStatus: () => () => undefined,
  getSync: () => state.sync,
  getActivity: () => "2:0",
  getLastError: () => state.last,
  getLimits: () => ({ session_grace: 60, ping_interval: 15, replay_max: 500, deadman_min: 15 }),
  getTopics: () => ["tasks:mine", "agents:org"],
  getPendingCount: () => 0,
  getUrl: () => "wss://hub/rekuest/session",
  id: "s-1" as string | null,
}));
vi.mock("./hooks", () => ({
  useRekuestSession: () => session,
  useRekuestSessionSync: () => state.sync,
}));

import { SessionStatusCard } from "./SessionStatusCard";

describe("SessionStatusCard", () => {
  afterEach(cleanup);

  it("says why live updates are down while they are", () => {
    const error = { message: "The server refused this window's sign-in.", detail: "Close code 4401", at: Date.now() };
    state.sync = { status: "reconnecting", since: Date.now() - 42_000, catchingUp: false, error };
    state.last = error;
    render(<SessionStatusCard />);
    expect(screen.getByTestId("session-status").textContent).toBe("Reconnecting for 42 s");
    expect(screen.getByText("The server refused this window's sign-in.")).toBeTruthy();
    expect(screen.getByText("Close code 4401")).toBeTruthy();
  });

  it("is live, and keeps the last interruption to read", () => {
    state.sync = { status: "open", since: null, catchingUp: false, error: null };
    state.last = { message: "The connection dropped without a word from the server.", detail: "Close code 1006", at: Date.now() };
    render(<SessionStatusCard />);
    expect(screen.getByTestId("session-status").textContent).toBe("Live");
    expect(screen.getByText("Last interrupted")).toBeTruthy();
    expect(screen.getByText("2 feeds")).toBeTruthy();
  });
});
