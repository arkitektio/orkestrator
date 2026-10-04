import { RekuestWiregram } from "@/core/linkers";
import Timestamp from "@/core/ui/timestamp";
import { useDetailActionQuery } from "@/rekuest/api/graphql";
import { AutomationState } from "@/rekuest/lib/automationStatus";
import { TaskArgValue } from "../task/TaskEventLog";
import { AutomationStatus } from "./AutomationStatus";

/** A rule's page header: its name at reading size, where it stands beside it, the error under it. */
export const RuleHeader = ({
  name,
  state,
  note,
  description,
  error,
  errorAt,
}: {
  name: string;
  state: AutomationState;
  /** Said next to the state: "next run in 3 hours". */
  note?: React.ReactNode;
  description?: string | null;
  error?: React.ReactNode;
  /** When it last failed. */
  errorAt?: string | null;
}) => (
  <header>
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
      <span className="flex items-center gap-3 text-sm text-muted-foreground">
        <AutomationStatus state={state} className="text-sm" />
        {note}
      </span>
    </div>
    {description && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>}
    {error && (
      <p className="mt-2 max-w-3xl text-sm text-destructive">
        {error}
        {errorAt && (
          <span className="ml-2 text-destructive/70" title={new Date(errorAt).toLocaleString()}>
            <Timestamp date={errorAt} relative />
          </span>
        )}
      </p>
    )}
  </header>
);

/** The rule as a list: one line per part, its word on the left. */
export const RuleRows = ({ children }: { children: React.ReactNode }) => (
  <dl className="grid max-w-3xl grid-cols-[5.5rem_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
    {children}
  </dl>
);

export const RuleRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <dt className="pt-px text-xs font-medium uppercase leading-5 tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="min-w-0 leading-5">{children}</dd>
  </>
);

/**
 * How long the rule lives: the date it ends, the runs it may create and how
 * many of them it has. No row for a rule without a limit.
 */
export const UntilRow = ({
  rule,
}: {
  rule: { endsAt?: string | null; maxRuns?: number | null; runCount: number };
}) => {
  if (!rule.endsAt && rule.maxRuns == null) return null;
  return (
    <RuleRow label="Until">
      {[
        rule.endsAt && `ends ${new Date(rule.endsAt).toLocaleString()}`,
        rule.maxRuns != null && `${rule.runCount} of ${rule.maxRuns} runs`,
      ]
        .filter(Boolean)
        .join(" · ")}
    </RuleRow>
  );
};

/** The wiregram a rule was imported with. No row for a rule made here. */
export const FromRow = ({
  rule,
}: {
  rule: { wireKey?: string | null; wiregram?: { id: string; name: string } | null };
}) => {
  if (!rule.wiregram) return null;
  return (
    <RuleRow label="From">
      <RekuestWiregram.DetailLink object={rule.wiregram} className="hover:underline">
        {rule.wiregram.name}
      </RekuestWiregram.DetailLink>
      {rule.wireKey && (
        <span className="ml-2 font-mono text-xs text-muted-foreground/70">{rule.wireKey}</span>
      )}
    </RuleRow>
  );
};

/**
 * The arguments every run is assigned with, as a row of the rule: shown
 * through the action's ports (labels, structures as their objects) rather
 * than as stored JSON. `receiving` is the argument a trigger fills with the
 * signalled object. No row when no argument is set.
 */
export const ArgumentsRow = ({
  action,
  args,
  receiving,
}: {
  action: string;
  args: unknown;
  receiving?: { port: string; identifier: string };
}) => {
  const { data } = useDetailActionQuery({ variables: { id: action } });
  const values = (args ?? {}) as Record<string, unknown>;
  const ports = (data?.action.args ?? []).filter(
    (port) => port.key === receiving?.port || values[port.key] != null,
  );
  if (ports.length === 0) return null;

  return (
    <RuleRow label="With">
      <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5">
        {ports.map((port) => (
          <div key={port.key} className="contents">
            <span className="text-muted-foreground">{port.label || port.key}</span>
            <span className="min-w-0 overflow-hidden">
              {port.key === receiving?.port ? (
                <>
                  the signalled <span className="font-mono text-xs">{receiving.identifier}</span>
                </>
              ) : (
                <TaskArgValue port={port} value={values[port.key]} />
              )}
            </span>
          </div>
        ))}
      </div>
    </RuleRow>
  );
};
