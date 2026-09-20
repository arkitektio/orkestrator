// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ServiceRuntimeState } from "@/lib/arkitekt/types";
import { ServiceStatusPanel } from "./ServiceUnavailable";

/**
 * The fallback a module shows when its service is not ready must SAY why. The
 * old `<>Loading</>` made a refused connection indistinguishable from a
 * health check in flight.
 */

const definition = { key: "mikro", service: "mikro", name: "Mikro" } as ServiceRuntimeState["definition"];
const alias = { host: "lab.example.org", port: 443, ssl: true, path: "mikro" } as ServiceRuntimeState["alias"];

const state = (patch: Partial<ServiceRuntimeState>): ServiceRuntimeState => ({
  key: "mikro",
  configured: true,
  definition,
  alias,
  status: "ready",
  errors: [],
  ...patch,
});

const noop = () => undefined;

describe("ServiceStatusPanel", () => {
  it("names the service and the URL it tried when the health check was refused", () => {
    render(
      <ServiceStatusPanel
        serviceKey="mikro"
        state={state({ status: "invalid", errors: ["Failed to fetch"], lastCheckedAt: Date.now() })}
        baseUrl="https://lab.example.org"
        allDown={false}
        onRetry={noop}
        onRetryAll={noop}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent("Mikro is not reachable");
    expect(screen.getByText(/connection was refused/i)).toBeInTheDocument();
    expect(screen.getByText("https://lab.example.org:443/mikro")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText(/loading/i)).toBeNull();
  });

  it("retries the one service, or every service when the whole server is down", async () => {
    const onRetry = vi.fn();
    const onRetryAll = vi.fn();
    const { rerender } = render(
      <ServiceStatusPanel
        serviceKey="mikro"
        state={state({ status: "invalid", errors: ["Failed to fetch"] })}
        allDown={false}
        onRetry={onRetry}
        onRetryAll={onRetryAll}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /retry mikro/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetryAll).not.toHaveBeenCalled();
    // The button stays disabled until the retry settles; wait for that.
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());

    rerender(
      <ServiceStatusPanel
        serviceKey="mikro"
        state={state({ status: "invalid", errors: ["Failed to fetch"] })}
        baseUrl="https://lab.example.org"
        allDown
        onRetry={onRetry}
        onRetryAll={onRetryAll}
      />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("The server is not reachable");
    expect(screen.getByText(/VPN/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry all services/i }));
    expect(onRetryAll).toHaveBeenCalledTimes(1);
  });

  it("is honest about a check still in flight, with no retry to press", () => {
    render(
      <ServiceStatusPanel
        serviceKey="mikro"
        state={state({ status: "checking" })}
        allDown={false}
        onRetry={noop}
        onRetryAll={noop}
      />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("Checking Mikro");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says when the deployment simply does not offer the service", () => {
    render(
      <ServiceStatusPanel
        serviceKey="elektro"
        state={undefined}
        baseUrl="https://lab.example.org"
        allDown={false}
        onRetry={noop}
        onRetryAll={noop}
      />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("elektro is not part of this deployment");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
