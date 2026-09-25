// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Status = {
  hasSelfService: boolean;
  connecting: boolean;
  hasStoredSession: boolean;
  hasBootstrapped: boolean;
  hasActiveProfile: boolean;
};

const status: Status = {
  hasSelfService: false,
  connecting: false,
  hasStoredSession: false,
  hasBootstrapped: false,
  hasActiveProfile: false,
};

vi.mock("./hooks", () => ({ useConnectionStatus: () => status }));

const { ConnectedGuard } = await import("./provider");

const renderGuard = (overrides: Partial<Status>) => {
  Object.assign(status, overrides);
  return render(
    <ConnectedGuard
      notConnectedFallback={<div>welcome</div>}
      connectingFallback={<div>connecting</div>}
      bootingFallback={<div>booting</div>}
    >
      <div>app</div>
    </ConnectedGuard>,
  );
};

beforeEach(() => {
  Object.assign(status, {
    hasSelfService: false,
    connecting: false,
    hasStoredSession: false,
    hasBootstrapped: false,
    hasActiveProfile: false,
  });
});

describe("ConnectedGuard", () => {
  it("boots when a stored profile is being brought up", () => {
    // The regression this guard exists for: an auto-login has no session YET,
    // and calling that "signed out" is what painted the welcome screen over
    // every launch.
    renderGuard({ hasActiveProfile: true, hasStoredSession: false, hasBootstrapped: false });
    expect(screen.getByText("booting")).toBeInTheDocument();
  });

  it("falls back to the connecting fallback when no booting one is given", () => {
    // Every pre-existing caller keeps the behaviour it had.
    Object.assign(status, { hasActiveProfile: true });
    render(
      <ConnectedGuard
        notConnectedFallback={<div>welcome</div>}
        connectingFallback={<div>connecting</div>}
      >
        <div>app</div>
      </ConnectedGuard>,
    );
    expect(screen.getByText("connecting")).toBeInTheDocument();
  });

  it("is signed out when nothing is stored and nothing is expected", () => {
    renderGuard({ hasBootstrapped: true });
    expect(screen.getByText("welcome")).toBeInTheDocument();
  });

  it("shows the connecting fallback during an explicit grant", () => {
    renderGuard({ hasStoredSession: true, hasBootstrapped: true, connecting: true });
    expect(screen.getByText("connecting")).toBeInTheDocument();
  });

  it("is signed out once a boot has failed", () => {
    // `setBootstrapError` clears the session and leaves the book intact, so the
    // profile is still active — the guard must not loop back into booting.
    renderGuard({ hasActiveProfile: true, hasStoredSession: false, hasBootstrapped: true });
    expect(screen.getByText("welcome")).toBeInTheDocument();
  });

  it("renders the app as soon as the self service exists", () => {
    renderGuard({ hasSelfService: true, hasStoredSession: true, hasBootstrapped: true });
    expect(screen.getByText("app")).toBeInTheDocument();
  });
});
