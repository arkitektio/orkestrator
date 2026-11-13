import { useArkitektStore } from "@/core/connection/arkitekt/hooks";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { useOperation } from "@/core/modules/hooks/useOperation";
import { MODULE_OPERATIONS } from "@/core/modules/registries";
import { reportError } from "@/core/notify";
import type { JSONObject } from "@/core/types";
import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Label } from "@/core/ui/label";
import { Textarea } from "@/core/ui/textarea";
import { isElectron } from "@/core/util/platform";
import { Check, ChevronRight, Download, Github, Send } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { RecordedError } from "./recorder";
import {
  buildReport,
  DEFAULT_SELECTION,
  renderMarkdown,
  renderReportFile,
  reportFileName,
  type BugReport,
  type ReportSelection,
} from "./report";
import { useReportSources } from "./useReportSources";

/** The operation a module offers to take a report (lok: the organization's admins read it). */
export const FILE_REPORT_OPERATION = "lok.fileBugReport";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const clock = (at: number) => new Date(at).toLocaleTimeString();

/** One part of the report: a tick box, how much there is, and exactly what would go. */
const Part = ({
  label,
  hint,
  count,
  checked,
  onChange,
  preview,
}: {
  label: string;
  hint?: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  preview?: ReactNode;
}) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border">
      <div className="flex items-start gap-2 px-3 py-2">
        <Checkbox id={id} className="mt-0.5" checked={checked} onCheckedChange={(value) => onChange(value === true)} />
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
            {count != null && <span className="ml-1.5 font-normal text-muted-foreground">{count}</span>}
          </Label>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {preview != null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs text-muted-foreground"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronRight className={open ? "mr-1 h-3 w-3 rotate-90" : "mr-1 h-3 w-3"} />
            {open ? "Hide" : "Show"}
          </Button>
        )}
      </div>
      {open && preview != null && <div className="border-t bg-muted/30 p-2">{preview}</div>}
    </div>
  );
};

const Pre = ({ children }: { children: string }) => (
  <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug">
    {children}
  </pre>
);

const errorText = (errors: readonly RecordedError[]) =>
  errors
    .map((error) => `${clock(error.at)} ${error.title ? `${error.title}: ` : ""}${error.message}\n${error.technical}`)
    .join("\n\n");

/**
 * "Report a bug". The user says what happened; below, every part of what the
 * app recorded is listed with a tick box and can be opened to see exactly
 * what would go. The report is built once from the ticks (`buildReport`), and
 * that one object is what is previewed, sent, saved or turned into an issue.
 *
 * Sent to the user's own deployment (`lok.fileBugReport`), where its admins
 * read it. Signed out, or the server away: saved as a file, or opened as a
 * prefilled GitHub issue.
 */
export const ReportBugDialog = ({
  screenshot,
  pinned,
}: {
  /** The window as it was when the report was asked for (a JPEG data URL). */
  screenshot?: string | null;
  /** The error this report is about, when it was opened from one. */
  pinned?: RecordedError | null;
}) => {
  const sources = useReportSources({ screenshot, pinned });
  const [description, setDescription] = useState("");
  const [expected, setExpected] = useState("");
  const [selection, setSelection] = useState<ReportSelection>(DEFAULT_SELECTION);
  const [saved, setSaved] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const descriptionId = useId();
  const expectedId = useId();

  const set = (key: keyof ReportSelection) => (checked: boolean) =>
    setSelection((current) => ({ ...current, [key]: checked }));

  // Every part ticked, to count and preview what there is; `report` is what goes.
  const all = useMemo(
    () => buildReport({ ...sources, description, expected }, { ...DEFAULT_SELECTION, data: true }),
    [sources, description, expected],
  );
  const report = useMemo(
    () => buildReport({ ...sources, description, expected }, selection),
    [sources, description, expected, selection],
  );

  const signedIn = useArkitektStore((state) => !!state.connection?.selfService?.client);
  const canSend = signedIn && FILE_REPORT_OPERATION in MODULE_OPERATIONS;
  const fileReport = useOperation(FILE_REPORT_OPERATION);

  const { submit, submitting } = useDialogSubmit(
    async (toSend: BugReport) => {
      const { screenshot: image, ...diagnostics } = toSend;
      try {
        await fileReport({
          title: toSend.title,
          description: toSend.description,
          expected: toSend.expected ?? null,
          route: toSend.environment.route,
          appVersion: toSend.environment.appVersion,
          platform: toSend.environment.platform,
          diagnostics: diagnostics as unknown as JSONObject,
          screenshot: image ?? null,
        });
      } catch (error) {
        setSendFailed(true);
        throw error;
      }
    },
    { errorTitle: "Couldn't send the report", successMessage: "Report sent to your organization's admins" },
  );

  const described = description.trim().length > 0;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!described) return;
    if (canSend) void submit(report);
    else void save();
  };

  const save = async () => {
    const content = renderReportFile(report);
    const name = reportFileName(report);
    try {
      if (window.api?.diagnostics) {
        const result = await window.api.diagnostics.save({ name, content });
        if (result.error) throw new Error(result.error);
        if (!result.saved) return;
      } else {
        const url = URL.createObjectURL(new Blob([content], { type: "text/html" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
      }
      setSaved(true);
    } catch (error) {
      reportError(error, "Couldn't save the report");
    }
  };

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const openIssue = () =>
    void window.api
      ?.reportIssue({
        title: report.title,
        labels: ["bug"],
        template: "bug_report.md",
        // The picture cannot ride in a URL; the saved file has it.
        includeScreenshot: false,
        body: renderMarkdown({ ...report, screenshot: undefined }, { limit: 5000 }),
      })
      ?.catch((error: unknown) => reportError(error, "Couldn't open the issue"));

  const consoleLines = (all.console?.length ?? 0) + (all.mainLog?.length ?? 0);
  const withVariables =
    (all.requests?.filter((request) => request.variables !== undefined).length ?? 0) +
    (all.queries?.filter((query) => query.variables !== undefined).length ?? 0);
  const withData = all.queries?.filter((query) => query.data !== undefined) ?? [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Report a bug</DialogTitle>
        <DialogDescription>
          {canSend
            ? "Goes to the admins of your organization, on your own server. Below is everything the report would carry; untick what should stay here."
            : "You are not signed in to a server that takes reports, so this one is saved as a file you can send, or opened as an issue on GitHub."}
        </DialogDescription>
      </DialogHeader>
      <DialogForm onSubmit={onSubmit}>
        <DialogBody>
          <div className="space-y-1.5">
            <Label htmlFor={descriptionId}>What happened?</Label>
            <Textarea
              id={descriptionId}
              autoFocus
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What you did, and what went wrong"
              className="min-h-20"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={expectedId}>What did you expect instead?</Label>
            <Textarea
              id={expectedId}
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              placeholder="Optional"
              className="min-h-10"
            />
          </div>

          {all.pinned && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-sm font-medium">About this error</p>
              <p className="break-words text-xs text-muted-foreground">
                {all.pinned.title ? `${all.pinned.title}: ` : ""}
                {all.pinned.message}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sent with it</p>
            <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
              Always: Orkestrator {all.environment.appVersion}, {all.environment.platform}
              {all.environment.route ? `, the page ${all.environment.route}` : ""}
              {all.environment.organization ? `, your organization and roles` : ""}, and which services were
              connected.
            </div>
            {sources.screenshot && (
              <Part
                label="Screenshot"
                hint="The window as it was when you asked to report."
                checked={selection.screenshot}
                onChange={set("screenshot")}
                preview={<img src={sources.screenshot} alt="Screenshot of the window" className="max-h-64 rounded border" />}
              />
            )}
            {!!all.errors?.length && (
              <Part
                label="Recent errors"
                count={all.errors.length}
                checked={selection.errors}
                onChange={set("errors")}
                preview={<Pre>{errorText(all.errors)}</Pre>}
              />
            )}
            {!!all.requests?.length && (
              <Part
                label="Failed requests"
                hint="Which request failed and what the server answered. Never what it returned."
                count={all.requests.length}
                checked={selection.requests}
                onChange={set("requests")}
                preview={
                  <Pre>
                    {all.requests
                      .map((request) => `${clock(request.at)} ${request.service} ${request.kind} ${request.operation}${request.status != null ? ` HTTP ${request.status}` : ""}\n${request.message}`)
                      .join("\n\n")}
                  </Pre>
                }
              />
            )}
            {!!all.steps?.length && (
              <Part
                label="Steps before this"
                hint="The pages you opened, and the dialogs and actions you used, by name."
                count={all.steps.length}
                checked={selection.steps}
                onChange={set("steps")}
                preview={<Pre>{all.steps.map((step) => `${clock(step.at)} ${step.kind} ${step.label}`).join("\n")}</Pre>}
              />
            )}
            {consoleLines > 0 && (
              <Part
                label="Console warnings and errors"
                count={consoleLines}
                checked={selection.console}
                onChange={set("console")}
                preview={
                  <Pre>
                    {[
                      ...(all.console ?? []).map((line) => `${clock(line.at)} ${line.level} ${line.text}${line.count > 1 ? ` (×${line.count})` : ""}`),
                      ...(all.mainLog ?? []),
                    ].join("\n")}
                  </Pre>
                }
              />
            )}
            {withVariables > 0 && (
              <Part
                label="Request variables"
                hint="The ids and inputs of the failed requests and of this page's queries."
                count={withVariables}
                checked={selection.variables}
                onChange={set("variables")}
                preview={
                  <Pre>
                    {pretty([
                      ...(all.requests ?? [])
                        .filter((request) => request.variables !== undefined)
                        .map((request) => ({ [request.operation]: request.variables })),
                      ...(all.queries ?? [])
                        .filter((query) => query.variables !== undefined)
                        .map((query) => ({ [query.label]: query.variables })),
                    ])}
                  </Pre>
                }
              />
            )}
            {!!all.hardware?.length && (
              <Part
                label="This computer's hardware"
                checked={selection.hardware}
                onChange={set("hardware")}
                preview={<Pre>{all.hardware.join("\n")}</Pre>}
              />
            )}
            {withData.length > 0 && (
              <Part
                label="What this page loaded"
                hint="The data this page's queries returned. This is your own data (names, metadata): add it only if the report needs it."
                count={withData.length}
                checked={selection.data}
                onChange={set("data")}
                preview={<Pre>{pretty(withData.map((query) => ({ [query.label]: query.data })))}</Pre>}
              />
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          {isElectron() && (!canSend || sendFailed) && (
            <Button type="button" variant="outline" disabled={!described} onClick={openIssue}>
              <Github />
              Open GitHub issue
            </Button>
          )}
          <Button
            type={canSend ? "button" : "submit"}
            variant={canSend ? "outline" : "default"}
            disabled={!described}
            onClick={canSend ? () => void save() : undefined}
          >
            {saved ? <Check /> : <Download />}
            {saved ? "Saved" : "Save as file"}
          </Button>
          {canSend && (
            <Button type="submit" disabled={!described || submitting}>
              <Send />
              {submitting ? "Sending…" : "Send report"}
            </Button>
          )}
        </DialogFooter>
      </DialogForm>
    </>
  );
};

export default ReportBugDialog;
