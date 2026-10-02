// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildConnectionDiagram } from "@/core/connection/arkitekt/doctor/diagram";
import type { DoctorReport } from "@/core/connection/arkitekt/doctor/findings";
import { ConnectionDiagram } from "@/core/connection/ui/doctor/ConnectionDiagram";
import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
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

/** One part of the diagram, by the id the view puts on it. */
const part = (id: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(`[data-part="${id}"]`);
  if (!element) throw new Error(`no diagram part "${id}"`);
  return element;
};

/** The hub answered lok twenty minutes ago; nothing answered this computer. */
const report = (online: boolean): DoctorReport => {
  const hub = {
    name: "lab-hub",
    online,
    lastSeenAt: "2026-09-22T00:00:00Z",
    version: "1.4.0",
    services: { mikro: { healthy: true } },
  };
  const target = { host: "mikro.tailnet.ts.net", port: 443, ssl: true, label: "mikro", serviceKey: "mikro", role: "service" as const };
  return {
    startedAt: 0,
    durationMs: 1200,
    context: { kind: "service", serviceKey: "mikro" },
    targets: [target],
    findings: [],
    network: [
      {
        target,
        url: "https://mikro.tailnet.ts.net/",
        dns: { ok: true, lookupAddresses: ["100.64.0.2"], resolveAddresses: ["100.64.0.2"] },
        tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 },
        tls: { attempted: false, ok: false },
        http: { attempted: false, ok: false },
        totalMs: 4000,
      },
    ],
    hub,
    lok: { status: "ok", hub },
  };
};

describe("ServiceStatusPanel", () => {
  it("says which service it could not reach and what it tried", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: "Couldn't reach Mikro" })).toBeInTheDocument();
    // The address it tried is a line in the diagram, not a sentence.
    expect(screen.getByRole("button", { name: /mikro\.tailnet\.ts\.net/ })).toBeInTheDocument();
  });

  it("names the deployment when everything is down, never the login server", () => {
    // The coordination server is where the login was granted; the services
    // run somewhere else, and that is what failed. Naming the wrong one sends
    // people off to debug a machine that is working fine.
    renderPanel({ allDown: true, deployment: { name: "jhnnsrs-lab" } });

    expect(screen.getByRole("heading", { name: "Couldn't reach jhnnsrs-lab" })).toBeInTheDocument();
    expect(screen.queryByText(/go\.arkitekt\.live/)).toBeNull();
  });

  it("draws the coordination server as working, and still never blames it in words", () => {
    renderPanel({
      allDown: true,
      deployment: { name: "jhnnsrs-lab" },
      coordination: { host: "go.arkitekt.live" },
    });

    // Its only mention is the green corner of the diagram.
    const mentions = screen.getAllByText(/go\.arkitekt\.live/);
    expect(mentions).toHaveLength(1);
    expect(part("coordination")).toContainElement(mentions[0]);
    expect(part("coordination")).toHaveAttribute("data-state", "ok");
    expect(within(part("coordination")).getByText("working")).toBeInTheDocument();
  });

  it("puts the break on the line to the hub, with its reason, and leaves the rest green", () => {
    renderPanel({ tunnel: "Arkitekt mesh · lab" });

    const line = part("serviceLink");
    expect(line).toHaveAttribute("data-state", "failed");
    expect(within(line).getByText("broken")).toBeInTheDocument();
    expect(within(line).getByText("No working alias found for service: mikro")).toBeInTheDocument();
    expect(within(line).getByText("Arkitekt mesh · lab")).toBeInTheDocument();

    expect(part("client")).toHaveAttribute("data-state", "ok");
    expect(part("signInLink")).toHaveAttribute("data-state", "ok");
    // Nobody has asked the hub yet, so its side is unknown rather than red.
    expect(part("hub")).toHaveAttribute("data-state", "unknown");
    expect(part("reportLink")).toHaveAttribute("data-state", "unknown");
  });

  it("keeps the break on the line when the hub reports itself healthy", () => {
    renderPanel({ doctor: { status: "done", report: report(true) } });

    expect(part("reportLink")).toHaveAttribute("data-state", "ok");
    expect(within(part("reportLink")).getByText("reporting")).toBeInTheDocument();
    expect(part("hub")).toHaveAttribute("data-state", "ok");
    expect(part("service")).toHaveAttribute("data-state", "ok");
    expect(part("serviceLink")).toHaveAttribute("data-state", "failed");
    expect(within(part("serviceLink")).getByText("TCP: ETIMEDOUT 4000ms")).toBeInTheDocument();
  });

  it("moves the break to the hub when it has stopped reporting", () => {
    renderPanel({ doctor: { status: "done", report: report(false) } });

    expect(part("reportLink")).toHaveAttribute("data-state", "failed");
    expect(within(part("reportLink")).getByText("not reporting")).toBeInTheDocument();
    expect(part("hub")).toHaveAttribute("data-state", "failed");
  });

  it("draws each address as its own line, with what it ran into for whoever asks", async () => {
    renderPanel({ doctor: { status: "done", report: report(true) } });

    const line = screen.getByRole("button", { name: /mikro\.tailnet\.ts\.net:443/ });
    expect(line.closest("[data-alias]")).toHaveAttribute("data-state", "failed");
    // Read out with the line, and shown on hover.
    expect(line).toHaveTextContent("TCP: ETIMEDOUT 4000ms");
    await userEvent.hover(line);
    expect((await screen.findAllByText("https://mikro.tailnet.ts.net:443")).length).toBeGreaterThan(0);
  });

  it("draws nothing until everything has been tested", () => {
    // The doctor's run is in flight (or about to start): no half-checked picture.
    for (const status of ["idle", "running"] as const) {
      const { unmount } = renderPanel({ doctor: { status } });
      expect(screen.getByText("Diagnosing…")).toBeInTheDocument();
      expect(document.querySelector("[data-part]")).toBeNull();
      unmount();
    }

    // A re-run makes the last report stale, so it waits again.
    const { unmount } = renderPanel({ doctor: { status: "running", report: report(true) } });
    expect(screen.getByText("Diagnosing…")).toBeInTheDocument();
    expect(document.querySelector("[data-part]")).toBeNull();
    unmount();

    renderPanel({ doctor: { status: "done", report: report(true) } });
    expect(screen.queryByText("Diagnosing…")).toBeNull();
    expect(part("serviceLink")).toHaveAttribute("data-state", "failed");
  });

  it("only says it is connecting while the addresses are still being tried", () => {
    // Nothing has failed yet: no picture, no diagnosis, nothing red.
    for (const status of ["checking", "configured"] as const) {
      const { unmount } = renderPanel({ state: state({ status, errors: [] }), doctor: { status: "idle" } });
      expect(screen.getByRole("heading", { name: "Connecting to Mikro" })).toBeInTheDocument();
      expect(screen.queryByText("Diagnosing…")).toBeNull();
      expect(screen.queryByLabelText("Connection diagram")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      unmount();
    }
  });

  it("says what it could not reach first, then diagnoses, then shows the picture", () => {
    const { unmount } = renderPanel({ doctor: { status: "running" } });
    expect(screen.getByRole("heading", { name: "Couldn't reach Mikro" })).toBeInTheDocument();
    expect(screen.getByText("Diagnosing…")).toBeInTheDocument();
    unmount();

    renderPanel({
      doctor: {
        status: "done",
        report: { ...report(true), findings: [{ id: "x", severity: "blocker", title: "The way to the hub is broken", detail: "d" }] },
      },
    });
    expect(screen.queryByText("Diagnosing…")).toBeNull();
    // The likeliest reason is one line under the heading, not a card.
    expect(screen.getByText("The way to the hub is broken")).toBeInTheDocument();
    expect(part("serviceLink")).toHaveAttribute("data-state", "failed");
  });

  it("lists nothing under the picture: no report cards, only the report to copy", () => {
    renderPanel({ doctor: { status: "done", report: report(true) } });
    expect(screen.queryByText(/Most likely reason/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /check again|run diagnostics/i })).toBeNull();
    expect(screen.getByRole("button", { name: /copy report/i })).toBeInTheDocument();
  });

  it("falls back to 'this deployment' rather than inventing a name", () => {
    renderPanel({ allDown: true });
    expect(screen.getByRole("heading", { name: "Couldn't reach this deployment" })).toBeInTheDocument();
  });

  it("names the deployment for a service it simply does not offer, and draws nothing", () => {
    renderPanel({
      state: state({ status: "unconfigured", errors: [] }),
      deployment: { name: "jhnnsrs-lab" },
    });
    expect(screen.getByText(/does not offer the/)).toBeInTheDocument();
    expect(screen.getByText("jhnnsrs-lab")).toBeInTheDocument();
    expect(screen.queryByLabelText("Connection diagram")).toBeNull();
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

  it("asks once before reading a Tailscale it does not run, and passes the answer on", async () => {
    const onTailscaleAnswer = vi.fn();
    renderPanel({ tailscaleConsent: "ask", onTailscaleAnswer });

    const question = screen.getByRole("group", { name: "Ask Tailscale" });
    expect(question).toHaveTextContent("tailscale status");
    await userEvent.click(within(question).getByRole("checkbox"));
    await userEvent.click(within(question).getByRole("button", { name: "Run it" }));
    expect(onTailscaleAnswer).toHaveBeenCalledWith(true, true);
  });

  it("does not ask again once it has an answer, and draws the relay Tailscale reports", () => {
    renderPanel({
      tailscaleConsent: "allowed",
      onTailscaleAnswer: vi.fn(),
      tailscale: {
        vendor: "tailscale",
        available: true,
        backendState: "Running",
        tailnetName: "tailnet.ts.net",
        peers: [{ dnsName: "mikro.tailnet.ts.net.", ips: ["100.64.0.2"], online: true, relay: "fra" }],
      },
    });

    expect(screen.queryByRole("group", { name: "Ask Tailscale" })).toBeNull();
    // The relay is a stop of its own, between this computer and the hub.
    expect(document.querySelector('[data-relay="fra"]')).toHaveTextContent("DERP fra");
    expect(document.querySelector("[data-alias]")).toHaveAttribute("data-lane", "mesh");
  });

  it("draws one relay for every address that goes through the same DERP region", () => {
    const alias = (id: string, host: string) => ({ id, host, port: 443, ssl: true, challenge: "c" });
    renderPanel({
      state: state({
        instance: { identifier: "m", service: "mikro", aliases: [alias("a", "mikro.tailnet.ts.net"), alias("b", "100.64.0.2")] },
      } as Partial<ServiceRuntimeState>),
      tailscaleConsent: "allowed",
      tailscale: {
        vendor: "tailscale",
        available: true,
        backendState: "Running",
        peers: [{ dnsName: "mikro.tailnet.ts.net.", ips: ["100.64.0.2"], online: true, relay: "fra" }],
      },
    });

    expect(document.querySelectorAll("[data-alias]")).toHaveLength(2);
    expect(document.querySelectorAll('[data-relay="fra"]')).toHaveLength(1);
  });

  it("greys out a relay that the connection in use does not go through", () => {
    const alias = (id: string, host: string) => ({ id, host, port: 443, ssl: true, challenge: "c" });
    const lan = alias("lan", "192.168.1.20");
    // A connected service never shows this page; Settings draws the same picture for it.
    render(
      <ConnectionDiagram
        diagram={buildConnectionDiagram({
          serviceKey: "mikro",
          serviceName: "Mikro",
          status: "ready",
          aliases: [lan, alias("a", "mikro.tailnet.ts.net")],
          chosenAlias: lan,
          tailscale: {
            vendor: "tailscale",
            available: true,
            backendState: "Running",
            peers: [{ dnsName: "mikro.tailnet.ts.net.", ips: ["100.64.0.2"], online: true, relay: "fra" }],
          },
        })}
      />,
    );

    expect(document.querySelector('[data-relay="fra"]')).toHaveAttribute("data-use", "standby");
    expect(document.querySelector('[data-alias="192.168.1.20:443"]')).toHaveAttribute("data-use", "in-use");
  });

  it("warns that a relay costs performance to whoever hovers it", async () => {
    renderPanel({
      tailscaleConsent: "allowed",
      tailscale: {
        vendor: "tailscale",
        available: true,
        backendState: "Running",
        peers: [{ dnsName: "mikro.tailnet.ts.net.", ips: ["100.64.0.2"], online: true, relay: "fra" }],
      },
    });

    await userEvent.hover(document.querySelector('[data-relay="fra"]')!);
    expect((await screen.findAllByText(/Performance might be impacted/)).length).toBeGreaterThan(0);
  });

  it("shows a part's report to whoever hovers it", async () => {
    renderPanel({ coordination: { host: "go.arkitekt.live" } });

    await userEvent.hover(part("coordination"));
    expect((await screen.findAllByText("where this session signed in")).length).toBeGreaterThan(0);
  });

  it("opens a part's findings under the diagram when asked", async () => {
    const withFinding = report(true);
    withFinding.findings = [
      { id: "hub.healthy-client-fails", severity: "blocker", title: "The hub sees it running", detail: "d", targetLabel: "mikro" },
    ];
    renderPanel({
      doctor: { status: "done", report: withFinding },
      renderFindings: (findings) => <div>{findings.map((finding) => finding.title).join(", ")}</div>,
    });

    expect(screen.queryByRole("region", { name: /Findings/ })).toBeNull();
    // The line to the hub is the part this finding is about.
    await userEvent.click(part("serviceLink"));
    expect(within(screen.getByRole("region", { name: /Findings/ })).getByText("The hub sees it running")).toBeInTheDocument();
  });
});
