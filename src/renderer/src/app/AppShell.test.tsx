// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

/** What the real guard decides from the store, as a switch the test flips. */
let phase: "signed-out" | "connecting" | "connected" = "signed-out";

vi.mock("./Arkitekt", () => ({
  Arkitekt: {
    Guard: ({
      children,
      notConnectedFallback,
      connectingFallback,
    }: {
      children: React.ReactNode;
      notConnectedFallback: React.ReactNode;
      connectingFallback: React.ReactNode;
    }) => (
      <>
        {phase === "connected"
          ? children
          : phase === "connecting"
            ? connectingFallback
            : notConnectedFallback}
      </>
    ),
  },
}));
// The app proper, reduced to landmarks.
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ navigationBar, children }: { navigationBar: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <nav aria-label="Modules and pinned pages">{navigationBar}</nav>
      {children}
    </div>
  ),
}));
vi.mock("./components/navigation/PrivateNavigationBar", () => ({
  PrivateNavigationBar: () => <div>rail</div>,
}));
vi.mock("@/command/tabs/TabOutlet", () => ({ TabOutlet: () => <div>tabs</div> }));
vi.mock("./AppRoutes", () => ({ AppRoutes: () => null }));
vi.mock("./components/debug/PageCorner", () => ({ PageCorner: () => <div>corner</div> }));
vi.mock("./components/fallbacks/NotConnected", () => ({
  NotConnected: () => <div>Welcome to Arkitekt</div>,
}));
vi.mock("./components/fallbacks/Connecting", () => ({
  ConnectingFallback: () => <div>Connecting to server...</div>,
}));

import { AppShell } from "./AppShell";

beforeEach(() => {
  phase = "signed-out";
});

describe("AppShell", () => {
  it("shows only the welcome screen when signed out — no rail, no tabs", () => {
    render(<AppShell />);
    expect(screen.getByText("Welcome to Arkitekt")).toBeInTheDocument();
    expect(screen.getByTestId("welcome-layout")).toBeInTheDocument();
    expect(screen.queryByLabelText("Modules and pinned pages")).toBeNull();
    expect(screen.queryByText("tabs")).toBeNull();
    expect(screen.queryByText("corner")).toBeNull();
  });

  it("keeps the rail away while a session is still being proven", () => {
    phase = "connecting";
    render(<AppShell />);
    expect(screen.getByText("Connecting to server...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Modules and pinned pages")).toBeNull();
  });

  it("shows the app with its rail once connected", () => {
    phase = "connected";
    render(<AppShell />);
    expect(screen.getByLabelText("Modules and pinned pages")).toBeInTheDocument();
    expect(screen.getByText("tabs")).toBeInTheDocument();
    expect(screen.getByText("corner")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to Arkitekt")).toBeNull();
  });
});
