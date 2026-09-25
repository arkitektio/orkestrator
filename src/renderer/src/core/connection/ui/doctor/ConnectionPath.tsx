import type { Finding } from "@/core/connection/arkitekt/doctor/findings";
import type { HopState, PathHop } from "@/core/connection/arkitekt/doctor/path";
import { cn } from "@/core/util/utils";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleDashed, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

/**
 * The hops the connection takes, top to bottom, with the first broken one
 * marked. The verdict above says why; this says where — and, as importantly,
 * that everything before it worked.
 */

const STATE_ICON: Record<HopState, ReactNode> = {
  ok: <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" aria-hidden />,
  warning: <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-hidden />,
  failed: <XCircle className="size-3.5 shrink-0 text-destructive" aria-hidden />,
  unknown: <CircleDashed className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />,
};

const STATE_LABEL: Record<HopState, string> = {
  ok: "working",
  warning: "working, with a warning",
  failed: "broken",
  unknown: "not checked",
};

const Hop = ({
  hop,
  breaking,
  renderFindings,
  nested,
}: {
  hop: PathHop;
  breaking?: PathHop;
  renderFindings: (findings: Finding[]) => ReactNode;
  nested?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const expandable = hop.findings.length > 0;
  const isBreak = hop === breaking;

  const row = (
    <>
      {STATE_ICON[hop.state]}
      <span className="sr-only">{STATE_LABEL[hop.state]}:</span>
      <span className={cn("shrink-0 text-xs font-medium", nested && "font-mono font-normal")}>{hop.label}</span>
      {hop.summary && <span className="min-w-0 truncate text-[11px] text-muted-foreground">{hop.summary}</span>}
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {isBreak && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
            breaks here
          </span>
        )}
        {expandable && (
          <ChevronDown
            className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        )}
      </span>
    </>
  );

  return (
    <li className={cn(nested && "pl-5")}>
      {expandable ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 py-1.5 text-left hover:bg-muted/40"
          aria-expanded={open}
          title={hop.summary}
          onClick={() => setOpen((value) => !value)}
        >
          {row}
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1.5" title={hop.summary}>
          {row}
        </div>
      )}
      {open && <div className="pb-1 pl-5">{renderFindings(hop.findings)}</div>}
      {hop.children && hop.children.length > 0 && (
        <ul className="border-l border-border/60 ml-[7px]">
          {hop.children.map((child) => (
            <Hop key={child.id} hop={child} breaking={breaking} renderFindings={renderFindings} nested />
          ))}
        </ul>
      )}
    </li>
  );
};

export const ConnectionPath = ({
  hops,
  breaking,
  renderFindings,
}: {
  hops: PathHop[];
  breaking?: PathHop;
  /** The panel's own finding rows, so a hop's findings read like every other. */
  renderFindings: (findings: Finding[]) => ReactNode;
}) => (
  <section aria-label="Connection path" className="space-y-1">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Where the connection goes
    </p>
    <ul className="rounded-md border border-border/60 px-3 py-1">
      {hops.map((hop) => (
        <Hop key={hop.id} hop={hop} breaking={breaking} renderFindings={renderFindings} />
      ))}
    </ul>
  </section>
);
