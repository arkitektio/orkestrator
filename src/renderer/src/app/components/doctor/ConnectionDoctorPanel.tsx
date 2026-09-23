import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RemedyId, RemedyResult } from "../../../../../main/doctor/protocol";
import type {
  DoctorReport,
  Finding,
  FindingSeverity,
  Remedy,
} from "@/lib/arkitekt/doctor/findings";
import { primaryFinding, secondaryFindings } from "@/lib/arkitekt/doctor/findings";
import type { DoctorStatus } from "@/lib/arkitekt/doctor/useConnectionDoctor";
import { breakingHop, buildConnectionPath } from "@/lib/arkitekt/doctor/path";
import { formatReport } from "@/lib/arkitekt/doctor/reportText";
import { ConnectionPath } from "./ConnectionPath";
import { StageTable } from "./StageTable";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ClipboardCopy, Copy, ExternalLink, Info, Loader2, Stethoscope, XCircle } from "lucide-react";
import { Link, useInRouterContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

/**
 * The doctor's report, as pure props.
 *
 * Same split as `ServiceStatusPanel` in `ServiceUnavailable.tsx`: state in,
 * page out, no store — so the copy can be checked without a network, and the
 * same panel can front the welcome screen, settings and a module fallback.
 *
 * It leads with ONE verdict — the likeliest reason, what to do about it, and
 * why we think so — because somebody who cannot connect wants an answer, not
 * a differential. Everything else the check noticed is kept, folded away
 * underneath, for the times the verdict is wrong.
 *
 * Only one interaction here changes anything on the machine, and it is
 * deliberately the most awkward one: a `run` remedy goes through a confirm
 * dialog that prints the literal command first.
 */

const SEVERITY_ICON: Record<FindingSeverity, React.ReactNode> = {
  blocker: <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />,
  warning: <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden />,
  info: <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />,
  ok: <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden />,
};

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  blocker: "Blocking problem",
  warning: "Warning",
  info: "Note",
  ok: "All clear",
};

export type ConnectionDoctorPanelProps = {
  report?: DoctorReport;
  status: DoctorStatus;
  error?: string;
  remedyResult?: RemedyResult;
  onRun: () => void;
  onRemedy: (id: RemedyId) => void;
  /** Shown before the first run, to say what is about to be checked. */
  subject?: string;
  /**
   * Centre the controls, for a surface that is itself centred (the unreachable
   * page). The findings stay left-aligned either way — they are prose.
   */
  centered?: boolean;
};

const RemedyButton = ({
  remedy,
  onRemedy,
}: {
  remedy: Remedy;
  onRemedy: (id: RemedyId) => void;
}) => {
  const [copied, setCopied] = useState(false);
  // The welcome screen renders the doctor outside any router; a <Link> there
  // would throw, so the remedy degrades to naming the page.
  const inRouter = useInRouterContext();

  if (remedy.kind === "manual") {
    return <p className="text-xs text-muted-foreground">{remedy.instructions}</p>;
  }

  if (remedy.kind === "copy") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard?.writeText(remedy.value).then(() => setCopied(true));
        }}
      >
        <Copy className="mr-2 size-3.5" />
        {copied ? "Copied" : remedy.label}
      </Button>
    );
  }

  if (remedy.kind === "navigate") {
    if (!inRouter) {
      return (
        <p className="text-xs text-muted-foreground">
          {remedy.label}: open Settings › Mesh once you are signed in.
        </p>
      );
    }
    return (
      <Button size="sm" variant="outline" asChild>
        <Link to={remedy.path}>
          <ArrowRight className="mr-2 size-3.5" />
          {remedy.label}
        </Link>
      </Button>
    );
  }

  if (remedy.kind === "open-url") {
    return (
      <Button size="sm" variant="outline" asChild>
        <a href={remedy.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 size-3.5" />
          {remedy.label}
        </a>
      </Button>
    );
  }

  // `run`: the only thing here that touches the machine, so it says exactly
  // what it will do before it does it.
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm">{remedy.label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{remedy.label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This runs the following command on this computer:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <pre className="rounded bg-muted px-3 py-2 font-mono text-xs">{remedy.confirm}</pre>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onRemedy(remedy.id)}>Run it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


const SEVERITY_LEAD: Record<FindingSeverity, string> = {
  blocker: "Most likely reason",
  warning: "Worth knowing",
  info: "What we found",
  ok: "Good news",
};

/**
 * The verdict: the reason, the way out, and the evidence behind it — in that
 * order, because that is the order the question gets asked in.
 */
const Verdict = ({
  finding,
  onRemedy,
}: {
  finding: Finding;
  onRemedy: (id: RemedyId) => void;
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        {SEVERITY_ICON[finding.severity]}
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {SEVERITY_LEAD[finding.severity]}
        </span>
        {finding.targetLabel && (
          <span className="font-mono text-[11px] text-muted-foreground/70">
            {finding.targetLabel}
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold leading-snug">{finding.title}</h3>

      {(finding.remedy || finding.docs) && (
        <div className="flex flex-wrap items-center gap-2">
          {finding.remedy && <RemedyButton remedy={finding.remedy} onRemedy={onRemedy} />}
          {finding.docs && (
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <a href={finding.docs} target="_blank" rel="noopener noreferrer">
                Learn more
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Why we think this
        </p>
        <p className="text-sm text-muted-foreground">{finding.detail}</p>
      </div>

      {finding.evidence && finding.evidence.length > 0 && (
        <Collapsible open={showEvidence} onOpenChange={setShowEvidence}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-1 text-[11px] text-muted-foreground">
              <ChevronDown
                className={`mr-1 size-3 transition-transform ${showEvidence ? "rotate-180" : ""}`}
              />
              What we saw
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1 space-y-0.5">
              {finding.evidence.map((line) => (
                <li key={line} className="font-mono text-[11px] break-all text-muted-foreground/70">
                  {line}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
};

const FindingRow = ({
  finding,
  onRemedy,
}: {
  finding: Finding;
  onRemedy: (id: RemedyId) => void;
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <li className="flex gap-3 border-b border-border/50 py-3 last:border-b-0">
      {SEVERITY_ICON[finding.severity]}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium">{finding.title}</span>
          {finding.targetLabel && (
            <span className="font-mono text-[11px] text-muted-foreground/70">
              {finding.targetLabel}
            </span>
          )}
          <span className="sr-only">{SEVERITY_LABEL[finding.severity]}</span>
        </div>

        <p className="text-xs text-muted-foreground">{finding.detail}</p>

        {(finding.remedy || finding.docs) && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {finding.remedy && <RemedyButton remedy={finding.remedy} onRemedy={onRemedy} />}
            {finding.docs && (
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <a href={finding.docs} target="_blank" rel="noopener noreferrer">
                  Learn more
                </a>
              </Button>
            )}
          </div>
        )}

        {finding.evidence && finding.evidence.length > 0 && (
          <Collapsible open={showEvidence} onOpenChange={setShowEvidence}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-[11px] text-muted-foreground">
                <ChevronDown
                  className={`mr-1 size-3 transition-transform ${showEvidence ? "rotate-180" : ""}`}
                />
                Details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-1 space-y-0.5">
                {finding.evidence.map((line) => (
                  <li key={line} className="font-mono text-[11px] break-all text-muted-foreground/70">
                    {line}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </li>
  );
};

/** Puts the plain-text report on the clipboard — the one hand-off to an admin. */
const CopyReportButton = ({ report }: { report: DoctorReport }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        void navigator.clipboard?.writeText(formatReport(report)).then(() => setCopied(true));
      }}
    >
      <ClipboardCopy className="mr-2 size-3.5" />
      {copied ? "Copied" : "Copy report"}
    </Button>
  );
};

const FindingList = ({ findings, onRemedy }: { findings: Finding[]; onRemedy: (id: RemedyId) => void }) => (
  <ul role="list">
    {findings.map((finding) => (
      <FindingRow key={`${finding.id}-${finding.targetLabel ?? ""}`} finding={finding} onRemedy={onRemedy} />
    ))}
  </ul>
);

export const ConnectionDoctorPanel = ({
  report,
  status,
  error,
  remedyResult,
  onRun,
  onRemedy,
  subject,
  centered,
}: ConnectionDoctorPanelProps) => {
  const running = status === "running";
  const verdict = report ? primaryFinding(report.findings) : undefined;
  const rest = report ? secondaryFindings(report.findings) : [];
  const [showRest, setShowRest] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const path = useMemo(() => (report ? buildConnectionPath(report) : []), [report]);
  const breaking = breakingHop(path);

  return (
    <div className="space-y-4" aria-busy={running}>
      {!report && (
        <p className={cn("text-sm text-muted-foreground", centered && "text-center")}>
          {subject
            ? `Check what is stopping this computer from reaching ${subject}.`
            : "Check what is stopping this computer from reaching the server."}
        </p>
      )}

      <div className={cn("flex flex-wrap items-center gap-2", centered && "justify-center")}>
        <Button size="sm" onClick={onRun} disabled={running}>
          {running ? (
            <Loader2 className="mr-2 size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Stethoscope className="mr-2 size-3.5" />
          )}
          {running ? "Checking…" : report ? "Check again" : "Run diagnostics"}
        </Button>
        {report && !running && <CopyReportButton report={report} />}
        {report && (
          <span className="text-[11px] text-muted-foreground/70">
            checked {report.targets.length}{" "}
            {report.targets.length === 1 ? "address" : "addresses"} in{" "}
            {(report.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {status === "error" && (
        <p className="text-sm text-destructive">
          The check itself failed: {error ?? "unknown error"}
        </p>
      )}

      {remedyResult && (
        <div className="space-y-1 rounded-md border border-border/60 px-3 py-2">
          <p className={`text-xs ${remedyResult.ok ? "text-emerald-500" : "text-destructive"}`}>
            {remedyResult.message}
          </p>
          {remedyResult.loginUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={remedyResult.loginUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-3.5" />
                Finish signing in
              </a>
            </Button>
          )}
        </div>
      )}

      {verdict && <Verdict finding={verdict} onRemedy={onRemedy} />}

      {report && path.length > 1 && (
        <ConnectionPath
          hops={path}
          breaking={breaking}
          renderFindings={(findings) => <FindingList findings={findings} onRemedy={onRemedy} />}
        />
      )}

      {rest.length > 0 && (
        <Collapsible open={showRest} onOpenChange={setShowRest} className={cn(centered && "text-center")}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="px-1 text-xs text-muted-foreground">
              <ChevronDown
                className={`mr-1 size-3.5 transition-transform ${showRest ? "rotate-180" : ""}`}
              />
              {showRest ? "Hide" : "Show"} everything else we checked ({rest.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul role="list" className="border-t border-border/50">
              {rest.map((finding) => (
                <FindingRow
                  key={`${finding.id}-${finding.targetLabel ?? ""}`}
                  finding={finding}
                  onRemedy={onRemedy}
                />
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {report && report.network.length > 0 && (
        <Collapsible open={showAddresses} onOpenChange={setShowAddresses} className={cn(centered && "text-center")}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="px-1 text-xs text-muted-foreground">
              <ChevronDown
                className={`mr-1 size-3.5 transition-transform ${showAddresses ? "rotate-180" : ""}`}
              />
              {showAddresses ? "Hide" : "Show"} every address we tried ({report.network.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="text-left">
            <StageTable probes={report.network} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
