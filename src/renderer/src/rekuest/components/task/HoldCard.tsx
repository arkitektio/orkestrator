import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import { Textarea } from "@/core/ui/textarea";
import { cn } from "@/core/util/utils";
import { ArgPortFragment, PortKind, useDecideMutation, useDetailActionQuery } from "@/rekuest/api/graphql";
import { ActionLogo } from "@/rekuest/components/logo/ActionLogo";
import { ActionMonogram } from "@/rekuest/components/logo/ActionMonogram";
import { HoldDecision, HoldRequest } from "@/rekuest/lib/holds";
import { Check, CheckCircle2, Hand, Loader2, MessageSquarePlus, X, XCircle, Zap } from "lucide-react";
import { useState } from "react";

/** A structure as the wire carries it: `{__identifier, object}`. */
const asWireStructure = (value: unknown): { identifier: string; id: string } | null => {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  return typeof r.__identifier === "string" && r.object != null
    ? { identifier: r.__identifier, id: String(r.object) }
    : null;
};

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === "object" && Object.keys(value as object).length === 0);

const compact = (value: unknown): string => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * One argument as a person reads it: a structure is shown as itself (an image,
 * a release), whether the wire wrapped it or the port says what its id is; a
 * list counts and shows its first few; anything else is its value.
 */
const ArgValue = ({ value, port }: { value: unknown; port?: ArgPortFragment }) => {
  const wire = asWireStructure(value);
  const structure =
    wire ??
    (port?.kind === PortKind.Structure && port.identifier && (typeof value === "string" || typeof value === "number")
      ? { identifier: String(port.identifier), id: String(value) }
      : null);
  if (structure) {
    return (
      <StructureDisplay
        identifier={structure.identifier}
        id={structure.id}
        small
        fallback={<span className="font-mono text-[11px]">{`${structure.identifier} ${structure.id}`}</span>}
      />
    );
  }
  if (Array.isArray(value)) {
    const child = port?.children?.[0] as ArgPortFragment | undefined;
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {value.slice(0, 3).map((item, index) => (
          <ArgValue key={index} value={item} port={child} />
        ))}
        {value.length > 3 && <span className="text-muted-foreground">+{value.length - 3} more</span>}
      </span>
    );
  }
  if (typeof value === "boolean") return <span className="font-medium">{value ? "yes" : "no"}</span>;
  return <span className="line-clamp-2 break-all font-mono text-[11px]">{compact(value)}</span>;
};

/** The arguments, labelled by the action's ports where it is known, in their order. */
const HoldArgs = ({ args, ports }: { args: unknown; ports?: readonly ArgPortFragment[] }) => {
  if (isEmpty(args) || typeof args !== "object" || Array.isArray(args)) return null;
  const values = args as Record<string, unknown>;
  const keys = [
    ...(ports ?? []).map((port) => port.key).filter((key) => key in values),
    ...Object.keys(values).filter((key) => !(ports ?? []).some((port) => port.key === key)),
  ].filter((key) => !isEmpty(values[key]));
  if (keys.length === 0) return null;
  return (
    <dl className="grid grid-cols-[minmax(3.5rem,auto)_1fr] items-center gap-x-3 gap-y-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
      {keys.map((key) => {
        const port = ports?.find((candidate) => candidate.key === key);
        return (
          <div key={key} className="contents">
            <dt className="truncate text-[11px] text-muted-foreground" title={port?.description ?? undefined}>
              {port?.label || key}
            </dt>
            <dd className="min-w-0 text-xs">
              <ArgValue value={values[key]} port={port} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

/** The action's own logo, or its monogram; a hand for a task's hold on itself. */
const HoldBadge = ({ hold, logo }: { hold: HoldRequest; logo?: Parameters<typeof ActionLogo>[0]["action"]["logo"] }) => {
  const tile = "h-10 w-10 rounded-xl";
  if (hold.kind === "self" || !hold.action) {
    return (
      <span className={cn(tile, "flex shrink-0 items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
        <Hand className="h-5 w-5" />
      </span>
    );
  }
  return logo ? (
    <ActionLogo action={{ id: hold.action.id, logo }} className={cn(tile, "bg-muted/40 p-1.5")} />
  ) : (
    <ActionMonogram name={hold.action.name} className={cn(tile, "text-sm")} />
  );
};

/**
 * Something waits for the user's decision: a child an agent asked to run, or a
 * task's own hold. The title and description are the agent's own words, so
 * they are labelled as theirs; what the server knows for certain (the action,
 * the agent, the arguments) is shown beside them, the arguments as what they
 * are. Approve / Deny answer the held task with `decide`.
 */
export const HoldCard = ({ hold, className }: { hold: HoldRequest; className?: string }) => {
  const [decide] = useDecideMutation();
  const [answer, setAnswer] = useState("");
  const [answering, setAnswering] = useState(false);
  const [sending, setSending] = useState<"approve" | "deny" | null>(null);
  const { data } = useDetailActionQuery({
    variables: { id: hold.action?.id ?? "" },
    skip: !hold.action?.id,
    fetchPolicy: "cache-first",
  });
  const action = data?.action;

  const send = (approved: boolean) => {
    setSending(approved ? "approve" : "deny");
    // Sent, the card stays busy: it goes when the decision comes back as an event.
    // Only a refusal hands the buttons back.
    decide({
      variables: { input: { task: hold.task, approved, answer: answer.trim() || null } },
    }).catch((error: unknown) => {
      setSending(null);
      reportErrorAs(approved ? "Couldn't approve it" : "Couldn't deny it")(error);
    });
  };

  const speaker = hold.callerAgent?.name ?? (hold.kind === "self" ? "A task" : "An agent");

  return (
    <div
      role="group"
      aria-label={`Waiting for your decision: ${hold.title}`}
      className={cn(
        "relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-card p-3 shadow-sm",
        className,
      )}
    >
      {/* The accent: an edge in the waiting colour, so a held card reads as one at a glance. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-amber-500/70" />

      <div className="flex items-start gap-3 pl-1">
        <HoldBadge hold={hold} logo={action?.logo} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug text-foreground">{hold.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/80">{speaker}</span>
            {hold.kind === "assign" && hold.action ? (
              <>
                <span>asks to run</span>
                <span className="font-medium text-foreground/80">{action?.name ?? hold.action.name}</span>
                {hold.agent && (
                  <>
                    <span>on</span>
                    <span className="font-medium text-foreground/80">{hold.agent.name}</span>
                  </>
                )}
              </>
            ) : (
              <span>waits for you</span>
            )}
          </div>
        </div>
      </div>

      {hold.description && (
        <p className="ml-1 border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
          {hold.description}
        </p>
      )}

      {hold.kind === "assign" && (
        <div className="pl-1">
          <HoldArgs args={hold.args} ports={action?.args} />
        </div>
      )}

      {answering && (
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Anything to tell it? (optional)"
          className="ml-1 min-h-14 bg-background/60 text-xs"
          autoFocus
        />
      )}

      <div className="flex items-center gap-1.5 pl-1">
        <span className="mr-auto flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Waiting for you
        </span>
        {!answering && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setAnswering(true)}>
            <MessageSquarePlus className="size-3.5" /> Add a note
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={sending !== null} onClick={() => send(false)}>
          {sending === "deny" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} Deny
        </Button>
        <Button size="sm" className="h-8 text-xs" disabled={sending !== null} onClick={() => send(true)}>
          {sending === "approve" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Approve
        </Button>
      </div>
    </div>
  );
};

/**
 * What became of a hold, as one line in the conversation: approved or declined
 * (with the note, when one was written), or approved without asking in auto-mode.
 */
export const HoldDecisionLine = ({
  hold,
  decision,
  className,
}: {
  hold: HoldRequest;
  decision: HoldDecision;
  className?: string;
}) => {
  const Icon = decision.auto ? Zap : decision.approved ? CheckCircle2 : XCircle;
  const verb = decision.auto ? "Ran without asking" : decision.approved ? "You approved" : "You declined";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]",
        decision.approved
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
          : "border-border bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        {verb}: <span className="font-medium">{hold.title}</span>
        {decision.answer && <span className="text-muted-foreground"> · “{decision.answer}”</span>}
      </span>
    </div>
  );
};
