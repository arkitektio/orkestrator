// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DoctorReport, Finding } from "@/core/connection/arkitekt/doctor/findings";
import { ConnectionDoctorPanel } from "./ConnectionDoctorPanel";

const report = (findings: Finding[]): DoctorReport => ({
  startedAt: 0,
  durationMs: 1500,
  context: { kind: "service", serviceKey: "mikro" },
  targets: [{ host: "mikro.tailnet-cafe.ts.net", ssl: true }],
  findings,
  network: [],
});

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  id: "mesh.sidecar.needs-login",
  severity: "blocker",
  title: "This computer is no longer a member of the Lab mesh",
  detail: "Membership is granted when you sign in to the deployment.",
  ...overrides,
});

const renderPanel = (props: Partial<React.ComponentProps<typeof ConnectionDoctorPanel>> = {}) => {
  const onRun = vi.fn();
  render(
    <ConnectionDoctorPanel status="idle" onRun={onRun} {...props} />,
  );
  return { onRun };
};

describe("ConnectionDoctorPanel", () => {
  it("offers to run before it has anything to show", async () => {
    const { onRun } = renderPanel({ subject: "go.arkitekt.live" });
    expect(screen.getByText(/go\.arkitekt\.live/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /run diagnostics/i }));
    expect(onRun).toHaveBeenCalledOnce();
  });

  it("disables the button and says so while running", () => {
    renderPanel({ status: "running" });
    const button = screen.getByRole("button", { name: /checking/i });
    expect(button).toBeDisabled();
  });

  it("leads with one reason, and says why it thinks so", () => {
    renderPanel({
      status: "done",
      report: report([
        finding(),
        finding({ id: "net.tcp.refused", title: "Nothing is listening", detail: "Refused." }),
      ]),
    });

    // The verdict is stated as a heading, not as one bullet among many.
    expect(
      screen.getByRole("heading", { name: "This computer is no longer a member of the Lab mesh" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/most likely reason/i)).toBeInTheDocument();
    expect(screen.getByText(/why we think this/i)).toBeInTheDocument();
    expect(
      screen.getByText("Membership is granted when you sign in to the deployment."),
    ).toBeInTheDocument();
  });

  it("folds everything else away behind a count, so it never competes with the verdict", async () => {
    renderPanel({
      status: "done",
      report: report([
        finding(),
        finding({ id: "net.tcp.refused", title: "Nothing is listening", detail: "Refused." }),
        finding({ id: "net.tls.self-signed", title: "Self-signed certificate", detail: "Hm." }),
      ]),
    });

    expect(screen.queryByText("Nothing is listening")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /everything else we checked \(2\)/i }));

    expect(screen.getByText("Nothing is listening")).toBeInTheDocument();
    expect(screen.getByText("Self-signed certificate")).toBeInTheDocument();
  });

  it("says nothing about other checks when the verdict is the only finding", () => {
    renderPanel({ status: "done", report: report([finding()]) });
    expect(screen.queryByText(/everything else we checked/i)).not.toBeInTheDocument();
  });

  it("keeps the verdict's evidence folded away until asked", async () => {
    renderPanel({
      status: "done",
      report: report([finding({ evidence: ["https://mikro.example/health", "ECONNREFUSED"] })]),
    });

    expect(screen.queryByText("ECONNREFUSED")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /what we saw/i }));
    expect(screen.getByText("ECONNREFUSED")).toBeInTheDocument();
  });

  it("leads with the good news when there is nothing wrong", () => {
    renderPanel({
      status: "done",
      report: report([
        finding({
          id: "net.all-clear",
          severity: "ok",
          title: "Every address answered",
          detail: "All reachable.",
        }),
      ]),
    });

    expect(screen.getByText(/good news/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Every address answered" })).toBeInTheDocument();
  });

  it("renders a link remedy as a link", () => {
    renderPanel({
      status: "done",
      report: report([
        finding({
          remedy: { kind: "open-url", label: "Read the docs", url: "https://arkitekt.live/docs" },
        }),
      ]),
    });

    const link = screen.getByRole("link", { name: /read the docs/i });
    expect(link).toHaveAttribute("href", "https://arkitekt.live/docs");
  });

  it("shows manual instructions as plain text", () => {
    renderPanel({
      status: "done",
      report: report([
        finding({ remedy: { kind: "manual", instructions: "Ask the administrator to wake it." } }),
      ]),
    });
    expect(screen.getByText("Ask the administrator to wake it.")).toBeInTheDocument();
  });

  it("reports a failed check rather than an empty panel", () => {
    renderPanel({ status: "error", error: "bridge exploded" });
    expect(screen.getByText(/bridge exploded/)).toBeInTheDocument();
  });


  const failedProbe = {
    target: { host: "mikro.tailnet-cafe.ts.net", ssl: true, serviceKey: "mikro", label: "mikro", role: "service" as const },
    url: "https://mikro.tailnet-cafe.ts.net/ht",
    dns: { ok: true, lookupAddresses: ["100.64.0.2"], resolveAddresses: [] },
    tcp: { attempted: true, ok: false, code: "ETIMEDOUT", ms: 4000 },
    tls: { attempted: false, ok: false },
    http: { attempted: false, ok: false },
    totalMs: 4000,
  };

  const hubReport = (): DoctorReport => ({
    ...report([finding({ id: "hub.healthy-client-fails", severity: "warning", title: "lab-hub sees mikro running", targetLabel: "mikro" })]),
    targets: [failedProbe.target],
    network: [failedProbe],
    hub: {
      name: "lab-hub",
      online: true,
      lastSeenAt: new Date().toISOString(),
      version: "1.4.0",
      services: { mikro: { healthy: true } },
    },
    lok: { status: "ok", hub: { name: "lab-hub", online: true, version: "1.4.0", services: {} } },
  });

  it("draws the path and marks the hop that breaks, with both sides of the service", () => {
    renderPanel({ status: "done", report: hubReport() });

    const path = screen.getByRole("region", { name: "Connection path" });
    expect(path).toHaveTextContent("Hub lab-hub");
    expect(path).toHaveTextContent("hub: healthy");
    expect(path).toHaveTextContent("here: TCP: ETIMEDOUT 4000ms");
    expect(screen.getByText("breaks here")).toBeInTheDocument();
  });

  it("opens a hop's findings on click", async () => {
    renderPanel({ status: "done", report: hubReport() });
    // The verdict names it once; expanding the mikro hop shows it again, in place.
    expect(screen.getAllByText("lab-hub sees mikro running")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /mikro/ }));
    expect(screen.getAllByText("lab-hub sees mikro running")).toHaveLength(2);
  });

  it("copies a plain-text report", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderPanel({ status: "done", report: hubReport() });

    await userEvent.click(screen.getByRole("button", { name: /copy report/i }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("<- breaks here");
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("lists every address stage by stage", async () => {
    renderPanel({ status: "done", report: hubReport() });
    await userEvent.click(screen.getByRole("button", { name: /every address we tried \(1\)/i }));
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("ETIMEDOUT 4000ms");
    expect(table).toHaveTextContent("direct");
  });

  it("shows no path before a run", () => {
    renderPanel();
    expect(screen.queryByRole("region", { name: "Connection path" })).not.toBeInTheDocument();
  });
});
