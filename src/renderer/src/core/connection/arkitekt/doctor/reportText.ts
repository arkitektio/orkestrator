import type { DoctorReport } from "./findings";
import { primaryFinding, secondaryFindings } from "./findings";
import type { HopState, PathHop } from "./path";
import { breakingHop, buildConnectionPath } from "./path";
import { STAGES, STAGE_LABEL, stageOf } from "./stages";

/**
 * The report as plain text, for handing to whoever runs the hub.
 *
 * PRIVACY: this carries hostnames, IP addresses and the tailnet name (see
 * `main/doctor/protocol.ts`). It is only ever produced on the user's click
 * and put on their clipboard — never sent, logged or attached anywhere.
 */

const MARK: Record<HopState, string> = { ok: "ok  ", warning: "warn", failed: "FAIL", unknown: "?   " };
const STAGE_MARK = { ok: "ok", failed: "FAIL", skipped: "-" } as const;

const hopLines = (hop: PathHop, breaking: PathHop | undefined, indent = ""): string[] => [
  `${indent}[${MARK[hop.state]}] ${hop.label}${hop.summary ? ` — ${hop.summary}` : ""}${hop === breaking ? "   <- breaks here" : ""}`,
  ...(hop.children ?? []).flatMap((child) => hopLines(child, breaking, `${indent}    `)),
];

export const formatReport = (
  report: DoctorReport,
  { now = Date.now(), appVersion }: { now?: number; appVersion?: string } = {},
): string => {
  const path = buildConnectionPath(report, now);
  const breaking = breakingHop(path);
  const verdict = primaryFinding(report.findings);
  const context = report.context;
  const lines: string[] = [];

  lines.push("Orkestrator connection report");
  lines.push(`checked: ${new Date(report.startedAt).toISOString()} (${(report.durationMs / 1000).toFixed(1)}s)`);
  if (appVersion) lines.push(`app: ${appVersion}`);
  if (context.endpointUrl) lines.push(`coordination server: ${context.endpointUrl}`);
  if (context.kind === "service") lines.push(`service: ${context.serviceKey}`);
  if (typeof context.meshCoordUrl === "string") lines.push(`mesh control: ${context.meshCoordUrl}`);

  if (verdict) {
    lines.push("", `Verdict: ${verdict.title} [${verdict.id}]`, verdict.detail);
    for (const line of verdict.evidence ?? []) lines.push(`  ${line}`);
  }

  lines.push("", "Path:", ...path.flatMap((hop) => hopLines(hop, breaking, "  ")));

  if (report.network.length > 0) {
    lines.push("", "Addresses:");
    for (const probe of report.network) {
      const { route, stages } = stageOf(probe);
      const cells = STAGES.map((stage) => {
        const { state, detail } = stages[stage];
        return `${STAGE_LABEL[stage]} ${STAGE_MARK[state]}${detail ? ` (${detail})` : ""}`;
      });
      lines.push(`  ${probe.target.label || probe.target.host} [${route}] ${probe.url}`);
      lines.push(`    ${cells.join(" | ")}`);
    }
  }

  if (report.hub) {
    const hub = report.hub;
    lines.push("", `Hub report (${hub.name}):`);
    lines.push(
      `  online: ${hub.online} · last report: ${hub.lastSeenAt ?? "never"} · version: ${hub.version || "?"}`,
      `  mesh: ${hub.meshConnected === null || hub.meshConnected === undefined ? "unknown" : hub.meshConnected ? `connected as ${hub.meshHost ?? "?"}` : "not connected"}`,
    );
    for (const [key, entry] of Object.entries(hub.services)) {
      lines.push(`  ${key}: ${entry.healthy ? "healthy" : "unhealthy"}${entry.reason ? ` — ${entry.reason}` : ""}`);
    }
  } else if (report.lok) {
    lines.push("", `Hub report: none (${report.lok.status})`);
  }

  const rest = secondaryFindings(report.findings);
  if (rest.length > 0) {
    lines.push("", "Also found:");
    for (const finding of rest) {
      lines.push(`  - [${finding.severity}] ${finding.title} [${finding.id}${finding.targetLabel ? ` ${finding.targetLabel}` : ""}]`);
    }
  }

  return lines.join("\n");
};
