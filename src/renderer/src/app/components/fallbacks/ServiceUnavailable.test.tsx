// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ServiceRuntimeState } from "@/lib/arkitekt/types";
import { ServiceStatusPanel } from "./ServiceUnavailable";

const state = (overrides: Partial<ServiceRuntimeState> = {}): ServiceRuntimeState =>
  ({
    key: "mikro",
    configured: true,
    definition: { key: "mikro", name: "Mikro" },
    status: "invalid",
    errors: ["No working alias found for service: mikro"],
    alias: { id: "a", host: "mikro.tailnet.ts.net", port: 443, ssl: true, challenge: "c" },
    lastCheckedAt: Date.UTC(2026, 8, 22),
    ...overrides,
  }) as ServiceRuntimeState;

const renderPanel = (props: Partial<React.ComponentProps<typeof ServiceStatusPanel>> = {}) =>
  render(
    <ServiceStatusPanel
      serviceKey="mikro"
      state={state()}
      allDown={false}
      onRetry={vi.fn()}
      onRetryAll={vi.fn()}
      {...props}
    />,
  );

describe("ServiceStatusPanel", () => {
  it("says which service is unreachable and what it tried", () => {
    renderPanel();
    expect(screen.getByText("Mikro is not reachable")).toBeInTheDocument();
    expect(screen.getByText(/mikro\.tailnet\.ts\.net/)).toBeInTheDocument();
  });

  it("names the deployment when everything is down, never the login server", () => {
    // The coordination server is where the login was granted; the services
    // run somewhere else, and that is what failed. Naming the wrong one sends
    // people off to debug a machine that is working fine.
    renderPanel({
      allDown: true,
      deployment: { name: "jhnnsrs-lab" },
      hosts: ["jhnnsrs-lab.hyena-sole.ts.net"],
    });

    expect(screen.getByText("jhnnsrs-lab is not reachable")).toBeInTheDocument();
    expect(screen.getByText(/hyena-sole\.ts\.net/)).toBeInTheDocument();
    expect(screen.queryByText(/go\.arkitekt\.live/)).toBeNull();
  });

  it("only claims where the services run when there is one answer to give", () => {
    // Two hosts and there is no single "they run on X" to state, so it says
    // nothing rather than picking one at random.
    renderPanel({
      allDown: true,
      deployment: { name: "jhnnsrs-lab" },
      hosts: ["a.hyena-sole.ts.net", "b.hyena-sole.ts.net"],
    });

    expect(screen.queryByText(/They run on/)).toBeNull();
    expect(screen.getByText(/may need a VPN or mesh network/)).toBeInTheDocument();
  });

  it("falls back to 'this deployment' rather than inventing a name", () => {
    renderPanel({ allDown: true });
    expect(screen.getByText("This deployment is not reachable")).toBeInTheDocument();
  });

  it("names the deployment for a service it simply does not offer", () => {
    renderPanel({
      state: state({ status: "unconfigured", errors: [] }),
      deployment: { name: "jhnnsrs-lab" },
    });
    expect(screen.getByText(/does not offer the/)).toBeInTheDocument();
    expect(screen.getByText("jhnnsrs-lab")).toBeInTheDocument();
  });

  it("retries just this service, or all of them when everything is down", async () => {
    const onRetry = vi.fn();
    renderPanel({ onRetry });
    await userEvent.click(screen.getByRole("button", { name: /retry mikro/i }));
    expect(onRetry).toHaveBeenCalledOnce();

    const onRetryAll = vi.fn();
    renderPanel({ allDown: true, onRetryAll });
    await userEvent.click(screen.getByRole("button", { name: /retry all services/i }));
    expect(onRetryAll).toHaveBeenCalledOnce();
  });

  it("puts the diagnosis on this page rather than behind it", () => {
    // The thing that failed is already on screen; a sheet would cover it.
    renderPanel({
      diagnoseAction: <button type="button">Run diagnostics</button>,
      diagnostics: <div>the report</div>,
    });

    expect(screen.getByText("the report")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows neither slot while the service is merely being checked", () => {
    renderPanel({
      state: state({ status: "checking", errors: [] }),
      diagnoseAction: <button type="button">Run diagnostics</button>,
    });

    expect(screen.getByText(/checking mikro/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /run diagnostics/i })).toBeNull();
  });
});
