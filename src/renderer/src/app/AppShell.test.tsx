// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

/** What the store decides, as switches the test flips. */
let phase: "connected" | "booting" | "failed" = "booting";
let hasProfile = true;

vi.mock("./Arkitekt", () => ({
  Arkitekt: {
    useHasActiveProfile: () => hasProfile,
    Guard: ({
      children,
      notConnectedFallback,
      bootingFallback,
    }: {
      children: React.ReactNode;
      notConnectedFallback: React.ReactNode;
      connectingFallback: React.ReactNode;
      bootingFallback: React.ReactNode;
    }) => (
      <>
        {phase === "connected"
          ? children
          : phase === "booting"
            ? bootingFallback
            : notConnectedFallback}
      </>
    ),
  },
}));
// The app proper, reduced to landmarks.
vi.mock("@/app/layout/AppLayout", () => ({
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
vi.mock("@/core/command/tabs/TabOutlet", () => ({ TabOutlet: () => <div>tabs</div> }));
vi.mock("@/core/command/tabs/LinkContextMenu", () => ({ LinkContextMenu: () => null }));
vi.mock("./AppRoutes", () => ({ AppRoutes: () => null }));
vi.mock("../core/debug/ui/PageCorner", () => ({ PageCorner: () => <div>corner</div> }));
vi.mock("./components/fallbacks/NotConnected", () => ({
  NotConnected: () => <div>Welcome to Arkitekt</div>,
}));
vi.mock("../core/connection/ui/ShellSignInNotice", () => ({
  ShellSignInNotice: () => (phase === "failed" ? <div>Session expired</div> : null),
}));

import { AppShell } from "./AppShell";

beforeEach(() => {
  phase = "booting";
  hasProfile = true;
});

describe("AppShell", () => {
  it("shows only the welcome screen when no account is stored — no rail, no tabs", () => {
    hasProfile = false;
    render(<AppShell />);
    expect(screen.getByText("Welcome to Arkitekt")).toBeInTheDocument();
    expect(screen.getByTestId("welcome-layout")).toBeInTheDocument();
    expect(screen.queryByLabelText("Modules and pinned pages")).toBeNull();
    expect(screen.queryByText("tabs")).toBeNull();
  });

  it("opens straight into the shell while a stored profile is being proven", () => {
    // The whole point: no welcome screen on a launch that is about to succeed.
    render(<AppShell />);

    expect(screen.getByLabelText("Modules and pinned pages")).toBeInTheDocument();
    expect(screen.getByTestId("quiet-page")).toBeInTheDocument();
    expect(screen.queryByTestId("welcome-layout")).toBeNull();
    expect(screen.queryByText("Welcome to Arkitekt")).toBeNull();
    // The page stays quiet — no route, so no module query fires early.
    expect(screen.queryByText("tabs")).toBeNull();
  });

  it("keeps the shell, and the SAME rail, when the connection lands", () => {
    // `AppLayout` and the rail live OUTSIDE the guard precisely so the boot →
    // connected transition is not a remount. If someone folds the shell back
    // into a fallback prop, this is what catches it.
    const { rerender } = render(<AppShell />);
    const railWhileBooting = screen.getByText("rail");

    phase = "connected";
    rerender(<AppShell />);

    expect(screen.getByText("rail")).toBe(railWhileBooting);
    expect(screen.getByText("tabs")).toBeInTheDocument();
    expect(screen.getByText("corner")).toBeInTheDocument();
    expect(screen.queryByTestId("quiet-page")).toBeNull();
  });

  it("stays in the shell when auto-login fails, and says so there", () => {
    phase = "failed";
    render(<AppShell />);

    expect(screen.getByLabelText("Modules and pinned pages")).toBeInTheDocument();
    expect(screen.getByText("Session expired")).toBeInTheDocument();
    expect(screen.queryByTestId("welcome-layout")).toBeNull();
  });
});
