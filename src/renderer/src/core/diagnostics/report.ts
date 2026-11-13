import type { DiagnosticsSnapshot, RecordedConsole, RecordedError, RecordedRequest, RecordedStep } from "./recorder";
import { redactText, redactValue } from "./redact";

/**
 * A bug report as data: what the user wrote plus the parts of the record
 * they left ticked. Built once, when the report is filed, and then the SAME
 * object is previewed, sent, saved or turned into an issue, so the preview
 * cannot show less than what goes out.
 */
export type ReportSelection = {
  screenshot: boolean;
  errors: boolean;
  requests: boolean;
  steps: boolean;
  console: boolean;
  /** Variables of failed requests and of this page's queries. */
  variables: boolean;
  /** What this page's queries returned: the user's own data, so never by default. */
  data: boolean;
  hardware: boolean;
};

export const DEFAULT_SELECTION: ReportSelection = {
  screenshot: true,
  errors: true,
  requests: true,
  steps: true,
  console: true,
  variables: true,
  data: false,
  hardware: true,
};

export type ReportEnvironment = {
  appVersion: string;
  platform: string;
  route: string | null;
  organization?: string;
  roles?: readonly string[];
  /** Service key → its state ("ready", "unconfigured", …). */
  services?: Record<string, string>;
  modules?: readonly string[];
};

export type PageQuery = {
  label: string;
  variables?: unknown;
  data?: unknown;
  error?: string;
};

export type ReportSources = {
  description: string;
  expected?: string;
  /** The error the report was opened from, when it was opened from one. */
  pinned?: RecordedError | null;
  environment: ReportEnvironment;
  record: DiagnosticsSnapshot;
  /** The queries of the page being looked at, with their data. */
  queries?: readonly PageQuery[];
  mainLog?: readonly string[];
  hardware?: readonly string[];
  screenshot?: string | null;
  /** Strings that name this computer or its user; removed from every text. */
  scrub?: { home?: string; username?: string; hostname?: string };
};

export type BugReport = {
  version: 1;
  createdAt: string;
  title: string;
  description: string;
  expected?: string;
  environment: ReportEnvironment;
  pinned?: RecordedError;
  errors?: RecordedError[];
  requests?: RecordedRequest[];
  steps?: RecordedStep[];
  console?: RecordedConsole[];
  mainLog?: string[];
  queries?: PageQuery[];
  hardware?: string[];
  /** A JPEG data URL. Kept out of `diagnostics` when sent. */
  screenshot?: string;
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Removes the home folder, the user name and the computer's name from a text. */
export const scrubber = (scrub: ReportSources["scrub"]) => {
  const rules: [RegExp, string][] = [];
  if (scrub?.home && scrub.home.length > 1) {
    rules.push([new RegExp(escapeRegExp(scrub.home), "g"), "~"]);
    // The same path as JSON or a Windows log writes it.
    rules.push([new RegExp(escapeRegExp(scrub.home.replace(/\\/g, "\\\\")), "g"), "~"]);
  }
  if (scrub?.hostname && scrub.hostname.length > 2) {
    rules.push([new RegExp(escapeRegExp(scrub.hostname), "g"), "<hostname>"]);
  }
  if (scrub?.username && scrub.username.length > 2) {
    rules.push([new RegExp(`\\b${escapeRegExp(scrub.username)}\\b`, "g"), "<username>"]);
  }
  rules.push([/\/(home|Users)\/[^/\s"']+/g, "/$1/<username>"]);
  rules.push([/([A-Za-z]:\\+Users\\+)[^\\\s"']+/g, "$1<username>"]);
  return (text: string) => rules.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
};

const mapStrings = (value: unknown, fn: (text: string) => string): unknown => {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, mapStrings(inner, fn)]));
  }
  return value;
};

/** The first line of what the user wrote, as the report's name. */
export const reportTitle = (description: string, route: string | null): string => {
  const first = description.trim().split("\n")[0]?.trim() ?? "";
  if (!first) return route ? `Problem on ${route}` : "Problem report";
  return first.length > 80 ? `${first.slice(0, 79)}…` : first;
};

export const buildReport = (sources: ReportSources, selection: ReportSelection): BugReport => {
  const { record, environment } = sources;
  const withVariables = <T extends { variables?: unknown }>(entry: T): T =>
    selection.variables ? entry : { ...entry, variables: undefined };

  const queries = (sources.queries ?? [])
    .map((query) => ({
      label: query.label,
      variables: selection.variables ? redactValue(query.variables) : undefined,
      data: selection.data ? redactValue(query.data) : undefined,
      error: query.error ? redactText(query.error, 1000) : undefined,
    }))
    .filter((query) => query.variables !== undefined || query.data !== undefined || query.error !== undefined);

  const report: BugReport = {
    version: 1,
    createdAt: new Date().toISOString(),
    title: reportTitle(sources.description, environment.route),
    description: sources.description.trim(),
    expected: sources.expected?.trim() || undefined,
    environment,
    pinned: sources.pinned ?? undefined,
    errors: selection.errors && record.errors.length ? [...record.errors] : undefined,
    requests: selection.requests && record.requests.length ? record.requests.map(withVariables) : undefined,
    steps: selection.steps && record.steps.length ? [...record.steps] : undefined,
    console: selection.console && record.console.length ? [...record.console] : undefined,
    mainLog: selection.console && sources.mainLog?.length ? sources.mainLog.map((line) => redactText(line)) : undefined,
    queries: queries.length ? queries : undefined,
    hardware: selection.hardware && sources.hardware?.length ? [...sources.hardware] : undefined,
  };

  // The screenshot is a data URL: scrubbing would only corrupt it.
  const scrubbed = mapStrings(JSON.parse(JSON.stringify(report)), scrubber(sources.scrub)) as BugReport;
  if (selection.screenshot && sources.screenshot) scrubbed.screenshot = sources.screenshot;
  return scrubbed;
};

const time = (at: number) => new Date(at).toISOString().slice(11, 19);
const fence = (text: string) => ["```", text.replace(/```/g, "'''"), "```"];
const json = (value: unknown) => JSON.stringify(value, null, 2);

const errorLines = (error: RecordedError): string[] => [
  `- ${time(error.at)} [${error.source}] ${error.title ? `${error.title}: ` : ""}${error.message}${error.route ? ` (on ${error.route})` : ""}`,
];

/**
 * The report as Markdown: what the saved file shows, what an admin copies
 * into an issue. `limit` cuts it for a URL (the GitHub fallback), keeping the
 * start: what the user wrote, the environment, the error.
 */
export const renderMarkdown = (report: BugReport, options: { limit?: number } = {}): string => {
  const { environment: env } = report;
  const lines: string[] = ["### What happened?", report.description || "_Not described._", ""];
  if (report.expected) lines.push("### What was expected?", report.expected, "");

  lines.push("### Environment");
  lines.push(`- App version: \`${env.appVersion}\``, `- OS: \`${env.platform}\``, `- Page: \`${env.route ?? "unknown"}\``);
  if (env.organization) lines.push(`- Organization: ${env.organization}`);
  if (env.roles?.length) lines.push(`- Roles: ${env.roles.join(", ")}`);
  if (env.services && Object.keys(env.services).length) {
    lines.push(`- Services: ${Object.entries(env.services).map(([key, state]) => `${key} (${state})`).join(", ")}`);
  }
  lines.push(`- Reported: ${report.createdAt}`, "");

  if (report.pinned) {
    lines.push("### The error this report is about", ...errorLines(report.pinned), ...fence(report.pinned.technical), "");
  }
  if (report.errors?.length) {
    lines.push("### Recent errors");
    [...report.errors].reverse().forEach((error) => {
      lines.push(...errorLines(error));
      if (error.technical) lines.push(...fence(error.technical));
    });
    lines.push("");
  }
  if (report.requests?.length) {
    lines.push("### Failed requests");
    [...report.requests].reverse().forEach((request) => {
      const status = request.status != null ? ` HTTP ${request.status}` : "";
      lines.push(`- ${time(request.at)} ${request.service} ${request.kind} \`${request.operation}\`${status}: ${request.message.split("\n")[0]}`);
      if (request.variables !== undefined) lines.push(...fence(json(request.variables)));
    });
    lines.push("");
  }
  if (report.steps?.length) {
    lines.push("### Steps before the report");
    report.steps.forEach((step) => lines.push(`- ${time(step.at)} ${step.kind} ${step.label}`));
    lines.push("");
  }
  if (report.queries?.length) {
    lines.push("### This page's queries");
    report.queries.forEach((query) => {
      lines.push(`- \`${query.label}\`${query.error ? `: ${query.error}` : ""}`);
      if (query.variables !== undefined) lines.push(...fence(json(query.variables)));
      if (query.data !== undefined) lines.push(...fence(json(query.data)));
    });
    lines.push("");
  }
  if (report.hardware?.length) {
    lines.push("### Hardware", ...report.hardware.map((line) => `- ${line}`), "");
  }
  if (report.console?.length) {
    lines.push(
      "### Console",
      ...fence(
        report.console
          .map((line) => `${time(line.at)} ${line.level} ${line.text}${line.count > 1 ? ` (×${line.count})` : ""}`)
          .join("\n"),
      ),
      "",
    );
  }
  if (report.mainLog?.length) lines.push("### Main process log", ...fence(report.mainLog.join("\n")), "");

  const text = lines.join("\n").trim();
  if (!options.limit || text.length <= options.limit) return text;
  return `${text.slice(0, options.limit)}\n\n_Cut to fit; the saved report file has the rest._`;
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The report as one file a person can open and a developer can read back:
 * the screenshot, the Markdown as text, and the data itself in a JSON block.
 */
export const renderReportFile = (report: BugReport): string => {
  const { screenshot, ...rest } = report;
  const image =
    screenshot && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(screenshot)
      ? `<img src="${screenshot}" alt="Screenshot" style="max-width:100%;border:1px solid #8884;border-radius:6px">`
      : "";
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    `<title>${escapeHtml(report.title)}</title>`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<style>body{font:14px/1.5 system-ui,sans-serif;margin:24px;color-scheme:light dark}pre{white-space:pre-wrap;word-break:break-word}</style>",
    "</head><body>",
    `<h1>${escapeHtml(report.title)}</h1>`,
    image,
    `<pre>${escapeHtml(renderMarkdown(rest))}</pre>`,
    // `<` escaped so nothing in the data can close the block.
    `<script type="application/json" id="orkestrator-report">${JSON.stringify(rest).replace(/</g, "\\u003c")}</script>`,
    "</body></html>",
  ].join("\n");
};

/** "orkestrator-report-2026-11-13-1432.html" */
export const reportFileName = (report: BugReport): string =>
  `orkestrator-report-${report.createdAt.slice(0, 16).replace(/[T:]/g, "-")}.html`;
