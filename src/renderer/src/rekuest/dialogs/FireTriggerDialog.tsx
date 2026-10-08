import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Skeleton } from "@/core/ui/skeleton";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import {
  FiringOutcome,
  useFireTriggerMutation,
  useListTriggersQuery,
  useSignalQuery,
  useTriggerMatchingSignalsQuery,
} from "@/rekuest/api/graphql";
import { describeFiring } from "@/rekuest/lib/firing";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { useState } from "react";

const Choice = ({
  chosen,
  onClick,
  children,
}: {
  chosen: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={chosen}
    onClick={onClick}
    className={cn(
      "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
      chosen && "bg-accent",
    )}
  >
    {children}
  </button>
);

/** The triggers listening for signals like this one. */
const TriggerChoices = ({
  signal,
  value,
  onChange,
}: {
  signal: string;
  value?: string;
  onChange: (trigger: string) => void;
}) => {
  const signalQuery = useSignalQuery({ variables: { id: signal } });
  const of = signalQuery.data?.signal;
  const { data, error } = useListTriggersQuery({
    variables: { filters: { identifier: of?.identifier, kind: of?.kind }, pagination: { limit: 50 } },
    skip: !of,
  });
  const failure = signalQuery.error ?? error;
  if (failure) return <p className="text-sm text-destructive">{failure.message}</p>;
  if (!data) return <Skeleton className="h-9 w-full" />;
  if (data.triggers.length === 0) {
    return <p className="text-sm text-muted-foreground">No trigger listens for signals like this one.</p>;
  }
  return (
    <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
      {data.triggers.map((trigger) => (
        <Choice key={trigger.id} chosen={trigger.id === value} onClick={() => onChange(trigger.id)}>
          <span className="min-w-0 truncate">{trigger.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">runs {trigger.action.name}</span>
        </Choice>
      ))}
    </div>
  );
};

/** The stored signals this trigger would fire on as it is now. */
const SignalChoices = ({
  trigger,
  value,
  onChange,
}: {
  trigger: string;
  value?: string;
  onChange: (signal: string) => void;
}) => {
  const { data, error } = useTriggerMatchingSignalsQuery({ variables: { id: trigger } });
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data) return <Skeleton className="h-9 w-full" />;
  const signals = data.trigger.matchingSignals;
  if (signals.length === 0) {
    return <p className="text-sm text-muted-foreground">No stored signal matches this trigger.</p>;
  }
  return (
    <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
      {signals.map((signal) => (
        <Choice key={signal.id} chosen={signal.id === value} onClick={() => onChange(signal.id)}>
          <span className="min-w-0 truncate">
            <StructureDisplay
              identifier={signal.identifier}
              id={signal.object}
              variant="inline"
              fallback={<span className="font-mono text-xs">#{signal.object}</span>}
            />
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {KIND_LABELS[signal.kind]} <Timestamp date={signal.occurredAt ?? signal.receivedAt} relative />
          </span>
        </Choice>
      ))}
    </div>
  );
};

/**
 * Run a trigger on a stored signal by hand: a replay, logged as a firing of
 * its own. Opened with both (a firing's "Fire again"), with a signal (choose
 * among the triggers listening for it) or with a trigger (choose among the
 * signals it matches). The run is created whether or not the signal still
 * satisfies the trigger.
 */
export const FireTriggerDialog = (props: { signal?: string; trigger?: string }) => {
  const { closeDialog } = useDialog();
  const [signal, setSignal] = useState(props.signal);
  const [trigger, setTrigger] = useState(props.trigger);
  const [failure, setFailure] = useState<string | null>(null);
  const [fire, { loading }] = useFireTriggerMutation({
    refetchQueries: ["Signal", "Trigger", "ListFirings", "ListSignals"],
  });

  const submit = async () => {
    if (!signal || !trigger) return;
    setFailure(null);
    try {
      const { data } = await fire({ variables: { input: { signal, trigger } } });
      const firing = data?.fireTrigger;
      if (!firing) return;
      const words = describeFiring(firing);
      if (firing.outcome === FiringOutcome.Fired) toast.success(`${firing.trigger.name} fired`);
      else toast.error(`${words.label}${firing.reason ? `: ${firing.reason}` : ""}`);
      closeDialog();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Fire a trigger</DialogTitle>
        <DialogDescription>
          Runs the trigger&apos;s action on a stored signal now, as if the signal had just arrived.
        </DialogDescription>
      </DialogHeader>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trigger</h3>
        {props.trigger ? (
          <StructureDisplay identifier="@rekuest/trigger" id={props.trigger} variant="chip" />
        ) : signal ? (
          <TriggerChoices signal={signal} value={trigger} onChange={setTrigger} />
        ) : null}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Signal</h3>
        {props.signal ? (
          <StructureDisplay identifier="@rekuest/signal" id={props.signal} variant="chip" />
        ) : trigger ? (
          <SignalChoices trigger={trigger} value={signal} onChange={setSignal} />
        ) : null}
      </section>

      {failure && <p className="text-sm text-destructive">Could not fire it: {failure}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={loading || !signal || !trigger}>
          Fire
        </Button>
      </DialogFooter>
    </div>
  );
};
