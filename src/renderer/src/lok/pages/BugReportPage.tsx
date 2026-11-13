import { ADMIN_ROLE, RoleGuard } from "@/core/connection/roles";
import { isBugReport, ReportView } from "@/core/diagnostics/ReportView";
import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LokApp, LokBugReport, LokClient, LokRelease, LokUser } from "@/core/linkers";
import { reportErrorAs } from "@/core/notify";
import { Badge } from "@/core/ui/badge";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { CheckCircle2, ExternalLink, Github, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import {
  useDetailBugReportQuery,
  useForwardBugReportMutation,
  useUnresolveBugReportMutation,
} from "../api/graphql";
import { LOK_HELP } from "../help";
import { bugReportIssueUrl } from "../lib/bugReportIssue";

const openExternal = (url: string) => {
  if (window.api?.openWebbrowser) return window.api.openWebbrowser(url);
  window.open(url, "_blank", "noopener");
  return Promise.resolve();
};

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="truncate text-sm">{children}</dd>
  </div>
);

export const BugReportPage = asDetailQueryRoute(useDetailBugReportQuery, ({ data }) => {
  const report = data.bugReport;
  const { openDialog } = useDialog();
  const [forward] = useForwardBugReportMutation();
  const [unresolve] = useUnresolveBugReportMutation();
  const issueUrl = bugReportIssueUrl(report);

  // lok files nothing itself: the issue page opens prefilled in the browser,
  // and the report is marked so the next admin does not forward it again.
  const forwardToTracker = async () => {
    if (!issueUrl) return;
    await openExternal(issueUrl);
    await forward({ variables: { input: { id: report.id } } });
  };

  return (
    <LokBugReport.ModelPage
      help={LOK_HELP.bugReport}
      object={report}
      title={report.title}
      pageActions={
        <RoleGuard require={ADMIN_ROLE}>
          <PageAction
            collapse="icon"
            size="sm"
            icon={<Github className="h-4 w-4" />}
            disabled={!issueUrl}
            title={issueUrl ? undefined : "This app did not declare where its issues go"}
            onClick={() => void forwardToTracker().catch(reportErrorAs("Couldn't forward the report"))}
          >
            {report.forwardedAt ? "Forward again" : "Forward to GitHub"}
          </PageAction>
          {report.isResolved ? (
            <PageAction
              collapse="icon"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() =>
                void unresolve({ variables: { input: { id: report.id } } }).catch(
                  reportErrorAs("Couldn't reopen the report"),
                )
              }
            >
              Reopen
            </PageAction>
          ) : (
            <PageAction
              alwaysShow
              size="sm"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => openDialog("resolvebugreport", { id: report.id }, { size: "small" })}
            >
              Resolve
            </PageAction>
          )}
        </RoleGuard>
      }
    >
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{report.title}</h1>
            <Badge variant={report.isResolved ? "secondary" : "outline"}>{report.isResolved ? "Resolved" : "Open"}</Badge>
            {report.forwardedAt && <Badge variant="secondary">Forwarded</Badge>}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            <Fact label="Reported by">
              {report.reporter ? (
                <LokUser.DetailLink object={report.reporter} className="hover:underline">
                  {report.reporter.username}
                </LokUser.DetailLink>
              ) : (
                "Unknown"
              )}
            </Fact>
            <Fact label="When">
              <Timestamp date={report.createdAt} relative />
            </Fact>
            <Fact label="App">
              {report.release ? (
                <>
                  <LokApp.DetailLink object={report.release.app} className="hover:underline">
                    {report.release.app.identifier}
                  </LokApp.DetailLink>{" "}
                  <LokRelease.DetailLink object={report.release} className="text-muted-foreground hover:underline">
                    {report.release.version}
                  </LokRelease.DetailLink>
                </>
              ) : (
                "Unknown"
              )}
            </Fact>
            <Fact label="Client">
              {report.client ? (
                <LokClient.DetailLink object={report.client} className="hover:underline">
                  {report.client.node?.name ?? report.client.name}
                </LokClient.DetailLink>
              ) : (
                "No longer registered"
              )}
            </Fact>
            <Fact label="Version it says it runs">{report.appVersion ?? "Unknown"}</Fact>
            <Fact label="System">{report.platform ?? "Unknown"}</Fact>
            <Fact label="Page">
              <span className="font-mono text-xs">{report.route ?? "Unknown"}</span>
            </Fact>
          </dl>
        </div>

        <section className="space-y-1">
          <h2 className="text-sm font-medium">What happened</h2>
          <p className="whitespace-pre-wrap text-sm">{report.description}</p>
        </section>
        {report.expected && (
          <section className="space-y-1">
            <h2 className="text-sm font-medium">What was expected</h2>
            <p className="whitespace-pre-wrap text-sm">{report.expected}</p>
          </section>
        )}

        {report.isResolved && (
          <section className="rounded-md border px-3 py-2 text-sm">
            Resolved{report.resolvedBy ? ` by ${report.resolvedBy.username}` : ""}
            {report.resolvedAt && (
              <>
                {" "}
                <Timestamp date={report.resolvedAt} relative />
              </>
            )}
            {report.resolutionNote && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{report.resolutionNote}</p>}
          </section>
        )}
        {report.forwardedAt && (
          <section className="rounded-md border px-3 py-2 text-sm">
            Forwarded to the app's issue tracker{report.forwardedBy ? ` by ${report.forwardedBy.username}` : ""}{" "}
            <Timestamp date={report.forwardedAt} relative />
            {report.forwardedUrl && (
              <button
                type="button"
                className="ml-2 inline-flex items-center gap-1 underline"
                onClick={() => void openExternal(report.forwardedUrl as string)}
              >
                <ExternalLink className="h-3 w-3" />
                Open the issue
              </button>
            )}
          </section>
        )}

        {report.screenshot && (
          <section className="space-y-1">
            <h2 className="text-sm font-medium">Screenshot</h2>
            <img src={report.screenshot} alt="The window when the report was filed" className="max-w-full rounded-md border" />
          </section>
        )}

        <section className="space-y-1">
          <h2 className="text-sm font-medium">What the app recorded</h2>
          {isBugReport(report.diagnostics) ? (
            <ReportView report={report.diagnostics} />
          ) : (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px]">
              {JSON.stringify(report.diagnostics, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </LokBugReport.ModelPage>
  );
});

export default BugReportPage;
