import { useDialog } from "@/core/dialogs/registry";
import { RekuestSchedule, RekuestTrigger } from "@/core/linkers";
import { usePortForm } from "@/core/ports/engine/usePortForm";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { ArgsContainer } from "@/core/ports/widgets/ArgsContainer";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Input } from "@/core/ui/input";
import { ScrollArea } from "@/core/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { Skeleton } from "@/core/ui/skeleton";
import { Switch } from "@/core/ui/switch";
import { Textarea } from "@/core/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import {
  PortKind,
  ScheduleOverlap,
  useCreateScheduleMutation,
  useCreateTriggerMutation,
  useDetailActionQuery,
  useMatchingSignalsQuery,
  useSignalDeclarationsQuery,
  useUpdateScheduleMutation,
  useUpdateTriggerMutation,
} from "@/rekuest/api/graphql";
import { AutomationKind, describeDraft } from "@/rekuest/lib/automation";
import {
  CadenceDraft,
  cadenceToInput,
  defaultCadence,
  describeCadence,
} from "@/rekuest/lib/cron";
import {
  ConditionDraft,
  KIND_LABELS,
  describeCondition,
  toWireCondition,
  toWireConditions,
} from "@/rekuest/lib/triggerConditions";
import { AlarmClock, ChevronRight, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionPicker } from "../ActionPicker";
import { ConditionsEditor } from "../ConditionsEditor";
import { PinSelect } from "../PinSelect";
import { SchedulePanel } from "../SchedulePanel";
import { AutomationInitial, Pin, SignalWhen } from "./initial";
import { SignalPicker } from "./SignalPicker";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** An ISO instant as a `datetime-local` value (local time, to the minute), and back. */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** A whole number above zero, or null for an empty field. */
const positiveInt = (value: string) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const MATCH_LIMIT = 20;

export const BuilderLoading = ({ title }: { title: string }) => (
  <div className="space-y-4">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>Loading…</DialogDescription>
    </DialogHeader>
    <div className="space-y-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  </div>
);

/** A query the dialog stands on failed: say so, rather than load forever. */
export const BuilderError = ({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) => (
  <div className="flex flex-col gap-4">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>Could not load it: {errorMessage(error)}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </DialogFooter>
  </div>
);

/** One part of the rule: its word on the left, the choice on the right. */
const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
    <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </h3>
    <div className="flex min-w-0 flex-col gap-3">{children}</div>
  </section>
);

/** A choice that is made: what it is, and the way back to change it. */
const Chosen = ({
  children,
  onChange,
}: {
  children: React.ReactNode;
  onChange?: () => void;
}) => (
  <div className="flex min-h-9 items-center justify-between gap-3 rounded-md border px-3 text-sm">
    <span className="min-w-0 truncate">{children}</span>
    {onChange && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-mr-2 h-7 shrink-0 px-2 text-xs text-muted-foreground"
        onClick={onChange}
      >
        Change
      </Button>
    )}
  </div>
);

/** A small labelled field of the limits block. */
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="flex items-center justify-between gap-4 text-sm">
    <span>
      {label}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </span>
    {children}
  </label>
);

/**
 * A dry run of the rule being built: how many of the stored signals it would
 * have fired on. A hint, so it says nothing while loading or when the dry run
 * itself fails.
 */
const MatchingHint = ({
  when,
  conditions,
}: {
  when: SignalWhen;
  conditions: ConditionDraft[];
}) => {
  const debounced = useDebounce(conditions, 400);
  const checked = useMemo(() => toWireConditions(debounced), [debounced]);
  const { data } = useMatchingSignalsQuery({
    variables: {
      kind: when.kind,
      identifier: when.identifier,
      conditions: checked.ok ? checked.conditions : [],
      limit: MATCH_LIMIT,
    },
    skip: !checked.ok,
    fetchPolicy: "cache-and-network",
  });
  if (!checked.ok || !data) return null;
  const count = data.matchingSignals.length;
  return (
    <p className="text-xs text-muted-foreground">
      {count === 0
        ? "No stored signal would have fired this."
        : `Would have fired on ${count >= MATCH_LIMIT ? `${MATCH_LIMIT} or more` : count} of the stored signals.`}
    </p>
  );
};

const Toggle = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center justify-between gap-4 text-sm">
    <span>
      {label}
      <span className="block text-xs text-muted-foreground">{hint}</span>
    </span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

const NO_PORTS: never[] = [];

/**
 * One rule, top to bottom: WHEN it runs (a clock or a signal), ONLY IF
 * (a signal's conditions), what it DOes (the action and its arguments) and
 * WHERE. Every choice stays on screen with a way back, so nothing here is a
 * step that cannot be undone. `existing` edits a saved rule: everything can
 * be changed but its kind (a schedule does not become a trigger).
 *
 * The rule's own settings are plain state beside the port form: the form is
 * rebuilt from the action's ports, and would drop anything else it held.
 */
export const AutomationBuilder = ({
  initial,
  existing,
  sample,
}: {
  initial: AutomationInitial;
  existing?: { kind: AutomationKind; id: string };
  /** One real signal's descriptors, to suggest conditions from. */
  sample?: Record<string, unknown>;
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const { registry } = useWidgetRegistry();

  const [kind, setKind] = useState<AutomationKind>(existing?.kind ?? initial.kind ?? "clock");
  const [action, setAction] = useState(initial.action);
  const [pickingAction, setPickingAction] = useState(false);
  const [when, setWhen] = useState<SignalWhen | undefined>(initial.when);
  const [pickingSignal, setPickingSignal] = useState(false);
  const [cadence, setCadence] = useState<CadenceDraft>(() => initial.cadence ?? defaultCadence());
  const [conditions, setConditions] = useState<ConditionDraft[]>(initial.conditions ?? []);
  const [chosenPort, setChosenPort] = useState(initial.port);
  const [pin, setPin] = useState<Pin | null>(initial.pin ?? null);
  const [name, setName] = useState(initial.name ?? "");
  const [enabled, setEnabled] = useState(initial.enabled ?? true);
  const [ephemeralRuns, setEphemeralRuns] = useState(initial.ephemeralRuns ?? false);
  const [description, setDescription] = useState(initial.description ?? "");
  const [endsAt, setEndsAt] = useState(() => toLocalInput(initial.endsAt));
  const [maxRuns, setMaxRuns] = useState(initial.maxRuns != null ? String(initial.maxRuns) : "");
  const [allowOverlap, setAllowOverlap] = useState(initial.allowOverlap ?? false);
  const [catchUp, setCatchUp] = useState(initial.catchUp ?? false);
  const [debounceSeconds, setDebounceSeconds] = useState(
    initial.debounceSeconds != null ? String(initial.debounceSeconds) : "",
  );
  // Open when the rule already has a limit: a set limit must not hide.
  const [showLimits, setShowLimits] = useState(
    () =>
      !!initial.endsAt ||
      initial.maxRuns != null ||
      !!initial.allowOverlap ||
      !!initial.catchUp ||
      initial.debounceSeconds != null,
  );
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const actionQuery = useDetailActionQuery({ variables: { id: action ?? "" }, skip: !action });
  const detail = action && actionQuery.data?.action.id === action ? actionQuery.data.action : undefined;
  const declarationQuery = useSignalDeclarationsQuery({ skip: kind !== "signal" });
  const declarations = declarationQuery.data?.signalDeclarations ?? [];
  const declaration = when
    ? declarations.find((d) => d.identifier === when.identifier && d.kind === when.kind)
    : undefined;

  const args = detail?.args ?? NO_PORTS;
  // The arguments that can be handed the signalled object.
  const structurePorts = useMemo(
    () =>
      kind === "signal" && when
        ? args.filter(
            (port) => port.kind === PortKind.Structure && port.identifier === when.identifier,
          )
        : NO_PORTS,
    [args, kind, when],
  );
  const port = structurePorts.find((p) => p.key === chosenPort)?.key ?? structurePorts[0]?.key;
  // The signalled object fills `port`; the form asks for everything else.
  const formPorts = useMemo(
    () => (kind === "signal" && port ? args.filter((p) => p.key !== port) : args),
    [args, kind, port],
  );
  const form = usePortForm({ ports: formPorts, overwrites: initial.args });

  // Structures the chosen action takes: the signals it can be run on.
  const fits = useMemo(
    () =>
      new Set(
        args
          .filter((p) => p.kind === PortKind.Structure && p.identifier)
          .map((p) => p.identifier as string),
      ),
    [args],
  );

  const [createSchedule] = useCreateScheduleMutation({ refetchQueries: ["ListSchedules"] });
  const [updateSchedule] = useUpdateScheduleMutation();
  const [createTrigger] = useCreateTriggerMutation({ refetchQueries: ["ListTriggers"] });
  const [updateTrigger] = useUpdateTriggerMutation();

  const title = existing ? "Edit automation" : "New automation";
  if (action && actionQuery.error && !detail) {
    return <BuilderError title={title} error={actionQuery.error} onRetry={() => actionQuery.refetch()} />;
  }
  if (kind === "signal" && declarationQuery.error && !declarationQuery.data) {
    return (
      <BuilderError title={title} error={declarationQuery.error} onRetry={() => declarationQuery.refetch()} />
    );
  }

  const checkedCadence = cadenceToInput(cadence);
  const sentence = describeDraft({
    kind,
    cadence: checkedCadence.ok ? describeCadence(checkedCadence.input) : undefined,
    signal: when,
    conditions: conditions.filter((c) => toWireCondition(c).ok).map(describeCondition),
    action: detail?.name,
  });

  const showSignalPicker = kind === "signal" && (!when || pickingSignal);
  const showActionPicker = !action || pickingAction;
  // The action cannot be handed this signal's object: one of the two has to give.
  const mismatch = kind === "signal" && !!detail && !!when && !port;
  const ready = !!detail && !showActionPicker && (kind === "clock" || (!!when && !!port));

  const defaultName =
    kind === "signal" && when && detail
      ? `${detail.name} on ${KIND_LABELS[when.kind]} ${when.identifier}`
      : (detail?.name ?? "");

  const onSubmit = async (values: Record<string, unknown>) => {
    setAttempted(true);
    setFailure(null);
    if (!detail || !action) return;
    const finalName = name.trim() || defaultName;
    // Sent on every save, null where empty: an edit clears what was removed.
    const shared = {
      name: finalName,
      args: values,
      enabled,
      description: description.trim() || null,
      endsAt: fromLocalInput(endsAt),
      maxRuns: positiveInt(maxRuns),
      agent: pin?.agent ?? null,
      interface: pin?.interface ?? null,
    };
    try {
      if (kind === "clock") {
        if (!checkedCadence.ok) return;
        const clock = {
          ephemeralRuns,
          overlap: allowOverlap ? ScheduleOverlap.Allow : ScheduleOverlap.Skip,
          catchUp,
          ...checkedCadence.input,
        };
        if (existing) {
          await updateSchedule({
            variables: { input: { id: existing.id, action, ...shared, ...clock } },
          });
          closeDialog();
          return;
        }
        const result = await createSchedule({
          variables: {
            input: { action, ...shared, ...clock },
          },
        });
        closeDialog();
        const id = result.data?.createSchedule.id;
        if (id) navigate(RekuestSchedule.linkBuilder(id));
        return;
      }

      const checked = toWireConditions(conditions);
      if (!checked.ok) {
        setFailure(checked.error);
        return;
      }
      if (!when || !port) return;
      const signal = {
        identifier: when.identifier,
        kind: when.kind,
        port,
        conditions: checked.conditions,
        debounceSeconds: positiveInt(debounceSeconds),
      };
      if (existing) {
        await updateTrigger({
          variables: { input: { id: existing.id, action, ...shared, ...signal } },
        });
        closeDialog();
        return;
      }
      const result = await createTrigger({
        variables: {
          input: { action, ...shared, ...signal },
        },
      });
      closeDialog();
      const id = result.data?.createTrigger.id;
      if (id) navigate(RekuestTrigger.linkBuilder(id));
    } catch (error) {
      setFailure(`Could not save it: ${errorMessage(error)}`);
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const receiving = args.find((p) => p.key === port);

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{sentence}</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* max-h on the viewport: on the root it constrains nothing and the
              fields spill over the footer buttons */}
          <ScrollArea className="-mr-3 pr-3 [&>[data-slot=scroll-area-viewport]]:max-h-[64vh]">
            <div className="flex flex-col gap-6">
              <Section label="When">
                {!existing && (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    value={kind}
                    onValueChange={(next) => next && setKind(next as AutomationKind)}
                  >
                    <ToggleGroupItem value="clock" className="gap-1.5 px-3">
                      <AlarmClock className="h-3.5 w-3.5" />
                      On a clock
                    </ToggleGroupItem>
                    <ToggleGroupItem value="signal" className="gap-1.5 px-3">
                      <Zap className="h-3.5 w-3.5" />
                      On a signal
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
                {kind === "clock" && <SchedulePanel value={cadence} onChange={setCadence} />}
                {kind === "signal" && when && !showSignalPicker && (
                  <Chosen onChange={() => setPickingSignal(true)}>
                    <span className="font-mono text-xs">{when.identifier}</span> is{" "}
                    {KIND_LABELS[when.kind]}
                    {declaration && (
                      <span className="ml-2 text-xs text-muted-foreground">{declaration.service.name}</span>
                    )}
                  </Chosen>
                )}
                {showSignalPicker &&
                  (!declarationQuery.data ? (
                    <Skeleton className="h-9 w-full" />
                  ) : declarations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No service on this hub declares signals yet.
                    </p>
                  ) : (
                    <SignalPicker
                      declarations={declarations}
                      fits={detail ? fits : undefined}
                      fitsLabel={detail ? `${detail.name} can take` : undefined}
                      onPick={(next) => {
                        setWhen(next);
                        setPickingSignal(false);
                      }}
                    />
                  ))}
              </Section>

              {kind === "signal" && when && (
                <Section label="Only if">
                  <ConditionsEditor
                    value={conditions}
                    onChange={setConditions}
                    keys={declaration?.descriptorKeys ?? []}
                    sample={sample}
                    showErrors={attempted}
                  />
                  <MatchingHint when={when} conditions={conditions} />
                </Section>
              )}

              <Section label="Do">
                {showActionPicker ? (
                  <>
                    <ActionPicker
                      key={kind === "signal" ? (when?.identifier ?? "any") : "any"}
                      identifier={kind === "signal" ? when?.identifier : undefined}
                      onPick={(next) => {
                        // a pin names an implementation of the action it was chosen for
                        if (next !== action) setPin(null);
                        setAction(next);
                        setPickingAction(false);
                      }}
                    />
                    {action && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 self-start px-2 text-xs text-muted-foreground"
                        onClick={() => setPickingAction(false)}
                      >
                        Keep {detail?.name ?? "the current action"}
                      </Button>
                    )}
                  </>
                ) : !detail ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <>
                    <Chosen onChange={() => setPickingAction(true)}>
                      <span className="font-medium">{detail.name}</span>
                      {detail.description && (
                        <span className="ml-2 text-xs text-muted-foreground">{detail.description}</span>
                      )}
                    </Chosen>

                    {mismatch && when && (
                      <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3 text-sm">
                        <p>
                          {detail.name} takes no{" "}
                          <span className="font-mono text-xs">{when.identifier}</span>, so it cannot
                          be handed the signalled object.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setPickingAction(true)}>
                            Choose another action
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setPickingSignal(true)}>
                            Choose another signal
                          </Button>
                        </div>
                      </div>
                    )}

                    {kind === "signal" && receiving && when && (
                      <div className="flex min-h-9 items-center gap-3 text-sm">
                        {structurePorts.length > 1 ? (
                          <Select value={port} onValueChange={setChosenPort}>
                            <SelectTrigger className="h-8 w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {structurePorts.map((p) => (
                                <SelectItem key={p.key} value={p.key}>
                                  {p.label || p.key}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-medium">{receiving.label || receiving.key}</span>
                        )}
                        <span className="text-muted-foreground">
                          ← the signalled <span className="font-mono text-xs">{when.identifier}</span>
                        </span>
                      </div>
                    )}

                    {!mismatch && formPorts.length > 0 && (
                      <ArgsContainer
                        registry={registry}
                        groups={detail.portGroups ?? []}
                        ports={formPorts}
                        options={{ layout: "stack" }}
                        path={[]}
                      />
                    )}
                  </>
                )}
              </Section>

              {ready && detail && action && (
                <Section label="Where">
                  <PinSelect action={action} value={pin} onChange={setPin} />
                  <Input
                    className="h-8"
                    value={name}
                    aria-label="Name"
                    placeholder={defaultName || "Name"}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Textarea
                    className="min-h-16 text-sm"
                    value={description}
                    aria-label="Description"
                    placeholder="What it is for (optional)"
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <Toggle
                    label="Enabled"
                    hint={
                      kind === "clock"
                        ? "A paused schedule creates no runs."
                        : "A disabled trigger fires nothing."
                    }
                    checked={enabled}
                    onChange={setEnabled}
                  />
                  {kind === "clock" && (
                    <Toggle
                      label="Ephemeral runs"
                      hint="Runs are not kept in your task history."
                      checked={ephemeralRuns}
                      onChange={setEphemeralRuns}
                    />
                  )}
                  <button
                    type="button"
                    className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
                    aria-expanded={showLimits}
                    onClick={() => setShowLimits(!showLimits)}
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${showLimits ? "rotate-90" : ""}`}
                    />
                    Limits
                  </button>
                  {showLimits && (
                    <>
                      <Field label="Ends" hint="After this moment it creates no more runs.">
                        <Input
                          type="datetime-local"
                          className="h-8 w-56"
                          value={endsAt}
                          onChange={(e) => setEndsAt(e.target.value)}
                        />
                      </Field>
                      <Field label="Runs at most" hint="It ends after this many runs.">
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-24"
                          value={maxRuns}
                          placeholder="any"
                          onChange={(e) => setMaxRuns(e.target.value)}
                        />
                      </Field>
                      {kind === "clock" ? (
                        <>
                          <Toggle
                            label="Allow overlapping runs"
                            hint="Otherwise a slot is skipped while the last run is still open."
                            checked={allowOverlap}
                            onChange={setAllowOverlap}
                          />
                          <Toggle
                            label="Catch up"
                            hint="Run slots missed during downtime late, in order, instead of skipping them."
                            checked={catchUp}
                            onChange={setCatchUp}
                          />
                        </>
                      ) : (
                        <Field
                          label="Once per object every"
                          hint="Seconds. The first signal fires, later ones within the window are rejected."
                        >
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-24"
                            value={debounceSeconds}
                            placeholder="always"
                            onChange={(e) => setDebounceSeconds(e.target.value)}
                          />
                        </Field>
                      )}
                    </>
                  )}
                </Section>
              )}
            </div>
          </ScrollArea>

          {failure && <p className="text-sm text-destructive">{failure}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !ready || (kind === "clock" && !checkedCadence.ok)}
            >
              {existing ? "Save" : "Create automation"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};
