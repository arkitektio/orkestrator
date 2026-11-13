import { renderMarkdown, type BugReport } from "@/core/diagnostics/report";
import { isBugReport } from "@/core/diagnostics/ReportView";
import type { DetailBugReportFragment } from "../api/graphql";

/** A GitHub request line much longer than this is refused; the body is cut to fit. */
const BODY_LIMIT = 5500;

/**
 * A filed report as the body of an issue. What the reporter's app recorded is
 * rendered by the same function that wrote the report's own Markdown; a report
 * from an app that records differently falls back to what lok itself holds.
 */
export const bugReportIssueBody = (report: DetailBugReportFragment): string => {
  if (isBugReport(report.diagnostics)) {
    return renderMarkdown({ ...(report.diagnostics as BugReport), screenshot: undefined }, { limit: BODY_LIMIT });
  }
  return [
    "### What happened?",
    report.description,
    ...(report.expected ? ["", "### What was expected?", report.expected] : []),
    "",
    "### Environment",
    `- App version: \`${report.appVersion ?? "unknown"}\``,
    `- OS: \`${report.platform ?? "unknown"}\``,
    `- Page: \`${report.route ?? "unknown"}\``,
  ].join("\n");
};

/**
 * Where a report is forwarded to: the issue tracker of the app it was filed
 * from (`Client.issueUrl`, from the app's declared sources), prefilled. Null
 * when the app declared none.
 */
export const bugReportIssueUrl = (report: DetailBugReportFragment): string | null => {
  const base = report.client?.issueUrl;
  if (!base) return null;
  const params = new URLSearchParams();
  params.set("title", report.title);
  params.set("body", bugReportIssueBody(report));
  params.set("labels", "bug,user-reported");
  return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}`;
};
