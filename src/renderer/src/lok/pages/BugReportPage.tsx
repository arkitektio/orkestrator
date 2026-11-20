import { ADMIN_ROLE, RoleGuard } from "@/core/connection/roles";
import { isBugReport, ReportView } from "@/core/diagnostics/ReportView";
import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LokApp, LokBugReport, LokClient, LokRelease, LokUser } from "@/core/linkers";
import { reportErrorAs } from "@/core/notify";
import { Badge } from "@/core/ui/badge";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { Bug, CheckCircle2, ExternalLink, Github, RotateCcw } from "lucide-react";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
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

/** A plain section of the report's body: a heading and what it says. */
const Part = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
    {children}
  </section>
);

/**
 * One bug report: its title and state in the header, who reported it when on
 * the line under it; the app, client, system and page it came from in the Info
 * rail; and in the body what happened, what was expected, how it was resolved
 * or forwarded, the screenshot and what the app recorded.
 */
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
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["Status", report.isResolved ? "Resolved" : "Open"],
              [
                "Reported by",
                report.reporter ? (
                  <LokUser.DetailLink object={report.reporter} className="hover:underline">
                    {report.reporter.username}
                  </LokUser.DetailLink>
                ) : (
                  "Unknown"
                ),
              ],
              ["When", <Timestamp date={report.createdAt} relative />],
              [
                "App",
                report.release ? (
                  <span>
                    <LokApp.DetailLink object={report.release.app} className="hover:underline">
                      {report.release.app.identifier}
                    </LokApp.DetailLink>{" "}
                    <LokRelease.DetailLink object={report.release} className="text-muted-foreground hover:underline">
                      {report.release.version}
                    </LokRelease.DetailLink>
                  </span>
                ) : (
                  "Unknown"
                ),
              ],
              [
                "Client",
                report.client ? (
                  <LokClient.DetailLink object={report.client} className="hover:underline">
                    {report.client.node?.name ?? report.client.name}
                  </LokClient.DetailLink>
                ) : (
                  "No longer registered"
                ),
              ],
              ["Version it says it runs", report.appVersion ?? "Unknown"],
              ["System", report.platform ?? "Unknown"],
              ["Page", <span className="break-all font-mono text-xs">{report.route ?? "Unknown"}</span>],
              [
                "Report ID",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs">{report.id}</span>
                  <CopyButton value={report.id} title="Copy report ID" />
                </span>,
              ],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
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
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<Bug />}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {report.title}
              <Badge variant={report.isResolved ? "secondary" : "outline"}>{report.isResolved ? "Resolved" : "Open"}</Badge>
              {report.forwardedAt && <Badge variant="secondary">Forwarded</Badge>}
            </span>
          }
          description={
            <>
              {report.reporter ? `Reported by ${report.reporter.username}` : "Reporter unknown"}
              {" · "}
              <Timestamp date={report.createdAt} relative />
              {report.release && ` · ${report.release.app.identifier} ${report.release.version}`}
            </>
          }
        />

        <Part title="What happened">
          <p className="whitespace-pre-wrap text-sm">{report.description}</p>
        </Part>
        {report.expected && (
          <Part title="What was expected">
            <p className="whitespace-pre-wrap text-sm">{report.expected}</p>
          </Part>
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
          <Part title="Screenshot">
            <img src={report.screenshot} alt="The window when the report was filed" className="max-w-full rounded-md border" />
          </Part>
        )}

        <Part title="What the app recorded">
          {isBugReport(report.diagnostics) ? (
            <ReportView report={report.diagnostics} />
          ) : (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px]">
              {JSON.stringify(report.diagnostics, null, 2)}
            </pre>
          )}
        </Part>
      </div>
    </LokBugReport.ModelPage>
  );
});

export default BugReportPage;
