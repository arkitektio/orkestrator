import type { ReactNode } from "react";
import type { BugReport } from "./report";

const clock = (at: number) => new Date(at).toLocaleTimeString();

const Section = ({ title, count, children }: { title: string; count?: number; children: ReactNode }) => (
  <details className="group border-b last:border-b-0">
    <summary className="flex cursor-pointer select-none items-baseline gap-2 py-2 text-sm font-medium">
      {title}
      {count != null && <span className="font-normal text-muted-foreground">{count}</span>}
    </summary>
    <div className="pb-3">{children}</div>
  </details>
);

const Pre = ({ children }: { children: string }) => (
  <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px] leading-snug">
    {children}
  </pre>
);

/** Whether `value` is a report this app wrote (`buildReport`), as far as it can be told. */
export const isBugReport = (value: unknown): value is BugReport =>
  !!value && typeof value === "object" && (value as { version?: unknown }).version === 1 && "environment" in value;

/**
 * What a filed report recorded, part by part, each folded until asked for:
 * the same parts the reporter saw in the dialog before sending. Reads the
 * report as data, so it works for whoever holds one (the lok admin page).
 */
export const ReportView = ({ report }: { report: BugReport }) => {
  const env = report.environment;
  const services = Object.entries(env.services ?? {});
  return (
    <div>
      {report.pinned && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm font-medium">
            {report.pinned.title ? `${report.pinned.title}: ` : ""}
            {report.pinned.message}
          </p>
          {report.pinned.technical && <Pre>{report.pinned.technical}</Pre>}
        </div>
      )}
      {!!report.errors?.length && (
        <Section title="Recent errors" count={report.errors.length}>
          <div className="space-y-2">
            {[...report.errors].reverse().map((error, index) => (
              <div key={index}>
                <p className="text-xs">
                  <span className="font-mono text-muted-foreground">{clock(error.at)}</span>{" "}
                  {error.title ? `${error.title}: ` : ""}
                  {error.message}
                  {error.route && <span className="text-muted-foreground"> on {error.route}</span>}
                </p>
                {error.technical && <Pre>{error.technical}</Pre>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {!!report.requests?.length && (
        <Section title="Failed requests" count={report.requests.length}>
          <div className="space-y-2">
            {[...report.requests].reverse().map((request, index) => (
              <div key={index}>
                <p className="text-xs">
                  <span className="font-mono text-muted-foreground">{clock(request.at)}</span> {request.service}{" "}
                  {request.kind} <span className="font-mono">{request.operation}</span>
                  {request.status != null && ` (HTTP ${request.status})`}
                </p>
                <Pre>
                  {[request.message, request.variables !== undefined ? JSON.stringify(request.variables, null, 2) : ""]
                    .filter(Boolean)
                    .join("\n")}
                </Pre>
              </div>
            ))}
          </div>
        </Section>
      )}
      {!!report.steps?.length && (
        <Section title="Steps before the report" count={report.steps.length}>
          <Pre>{report.steps.map((step) => `${clock(step.at)} ${step.kind} ${step.label}`).join("\n")}</Pre>
        </Section>
      )}
      {!!report.queries?.length && (
        <Section title="The page's queries" count={report.queries.length}>
          <Pre>{JSON.stringify(report.queries, null, 2)}</Pre>
        </Section>
      )}
      {!!report.console?.length && (
        <Section title="Console" count={report.console.length}>
          <Pre>
            {report.console
              .map((line) => `${clock(line.at)} ${line.level} ${line.text}${line.count > 1 ? ` (×${line.count})` : ""}`)
              .join("\n")}
          </Pre>
        </Section>
      )}
      {!!report.mainLog?.length && (
        <Section title="Main process log" count={report.mainLog.length}>
          <Pre>{report.mainLog.join("\n")}</Pre>
        </Section>
      )}
      {!!report.hardware?.length && (
        <Section title="Hardware">
          <Pre>{report.hardware.join("\n")}</Pre>
        </Section>
      )}
      <Section title="Environment">
        <Pre>
          {[
            `App version: ${env.appVersion}`,
            `OS: ${env.platform}`,
            `Page: ${env.route ?? "unknown"}`,
            env.roles?.length ? `Roles: ${env.roles.join(", ")}` : "",
            services.length ? `Services: ${services.map(([key, state]) => `${key} (${state})`).join(", ")}` : "",
            env.modules?.length ? `Modules: ${env.modules.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("\n")}
        </Pre>
      </Section>
    </div>
  );
};

export default ReportView;
