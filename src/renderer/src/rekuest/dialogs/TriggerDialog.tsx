import { useDialog } from "@/core/dialogs/registry";
import { RekuestTrigger } from "@/core/linkers";
import { toast } from "@/core/notify";
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
import {
  DetailTriggerFragment,
  PortKind,
  SignalDeclarationFragment,
  SignalKind,
  useCreateTriggerMutation,
  useDetailActionQuery,
  useSignalDeclarationsQuery,
  useTriggerQuery,
  useUpdateTriggerMutation,
} from "@/rekuest/api/graphql";
import {
  ConditionDraft,
  KIND_LABELS,
  fromWireConditions,
  toWireConditions,
} from "@/rekuest/lib/triggerConditions";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionPicker } from "../components/automation/ActionPicker";
import { FieldBlock } from "../components/automation/FieldBlock";
import { ConditionsEditor } from "../components/automation/ConditionsEditor";
import { Pin, PinSelect } from "../components/automation/PinSelect";

export type SignalWhen = { identifier: string; kind: SignalKind };

const whenKey = (when: SignalWhen) => `${when.identifier}::${when.kind}`;

const LoadingBody = ({ title }: { title: string }) => (
  <div className="space-y-4">
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>Loading…</DialogDescription>
    </DialogHeader>
    <div className="space-y-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  </div>
);

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * The trigger itself: which argument receives the signalled object, extra
 * descriptor conditions, the other arguments, and the pin. Editing keeps
 * the signal, action, argument and pin (the backend does not change those).
 */
const TriggerForm = ({
  action,
  when,
  declaration,
  trigger,
}: {
  action: string;
  when: SignalWhen;
  declaration?: SignalDeclarationFragment;
  trigger?: DetailTriggerFragment;
}) => {
  const { data } = useDetailActionQuery({ variables: { id: action } });
  const detail = data?.action;
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const { registry } = useWidgetRegistry();

  const structurePorts = useMemo(
    () =>
      (detail?.args ?? []).filter(
        (port) => port.kind === PortKind.Structure && port.identifier === when.identifier,
      ),
    [detail, when.identifier],
  );

  const [chosenPort, setChosenPort] = useState<string | undefined>(trigger?.port);
  const port = chosenPort ?? structurePorts[0]?.key;

  // The signalled object fills `port`; the form asks for everything else.
  const otherPorts = useMemo(
    () => (detail?.args ?? []).filter((p) => p.key !== port),
    [detail, port],
  );

  const form = usePortForm({
    ports: otherPorts,
    overwrites: trigger?.args ?? undefined,
  });

  const [name, setName] = useState(trigger?.name ?? "");
  const [conditions, setConditions] = useState<ConditionDraft[]>(() =>
    fromWireConditions(trigger?.conditions),
  );
  const [pin, setPin] = useState<Pin | null>(null);
  const [enabled, setEnabled] = useState(trigger?.enabled ?? true);

  const [create] = useCreateTriggerMutation({ refetchQueries: ["ListTriggers"] });
  const [update] = useUpdateTriggerMutation();

  if (!detail) return <LoadingBody title={trigger ? "Edit trigger" : "New trigger"} />;

  if (!port) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>New trigger</DialogTitle>
          <DialogDescription>
            {detail.name} takes no {when.identifier}, so it cannot be handed the
            signalled object.
          </DialogDescription>
        </DialogHeader>
      </div>
    );
  }

  const defaultName = `${detail.name} on ${KIND_LABELS[when.kind]} ${when.identifier}`;

  const onSubmit = async (args: Record<string, unknown>) => {
    const checked = toWireConditions(conditions);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    const finalName = name.trim() || defaultName;
    try {
      if (trigger) {
        await update({
          variables: {
            input: {
              id: trigger.id,
              name: finalName,
              args,
              enabled,
              conditions: checked.conditions,
            },
          },
        });
        closeDialog();
        return;
      }
      const result = await create({
        variables: {
          input: {
            action,
            identifier: when.identifier,
            kind: when.kind,
            port,
            name: finalName,
            args,
            enabled,
            conditions: checked.conditions,
            agent: pin?.agent ?? null,
            interface: pin?.interface ?? null,
          },
        },
      });
      closeDialog();
      const id = result.data?.createTrigger.id;
      if (id) navigate(RekuestTrigger.linkBuilder(id));
    } catch (error) {
      toast.error(`Could not save the trigger: ${errorMessage(error)}`);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{trigger ? "Edit trigger" : "New trigger"}</DialogTitle>
        <DialogDescription>
          When a <span className="font-mono text-foreground">{when.identifier}</span> is{" "}
          {KIND_LABELS[when.kind]}, run{" "}
          <span className="font-medium text-foreground">{detail.name}</span> with it.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <ScrollArea className="-mr-3 pr-3 [&>[data-slot=scroll-area-viewport]]:max-h-[60vh]">
            <div className="flex flex-col gap-6">
              {structurePorts.length > 1 && !trigger && (
                <FieldBlock label="Hand it in as">
                  <Select value={port} onValueChange={setChosenPort}>
                    <SelectTrigger className="h-8 w-full">
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
                </FieldBlock>
              )}

              <FieldBlock
                label="Only if"
                description="Descriptor tests the object must pass, on top of what the argument itself requires."
              >
                <ConditionsEditor
                  value={conditions}
                  onChange={setConditions}
                  keys={declaration?.descriptorKeys ?? []}
                />
              </FieldBlock>

              {otherPorts.length > 0 && (
                <FieldBlock label="Other arguments" description="Every run is assigned with these.">
                  <ArgsContainer
                    registry={registry}
                    groups={detail.portGroups ?? []}
                    ports={otherPorts}
                    path={[]}
                  />
                </FieldBlock>
              )}

              <FieldBlock label="Name">
                <Input
                  className="h-8"
                  value={name}
                  placeholder={defaultName}
                  onChange={(e) => setName(e.target.value)}
                />
              </FieldBlock>

              {trigger ? (
                trigger.agent && (
                  <FieldBlock label="Runs on">
                    <p className="text-sm">
                      {trigger.agent.name}
                      <span className="ml-2 text-muted-foreground">{trigger.interface}</span>
                    </p>
                  </FieldBlock>
                )
              ) : (
                <FieldBlock label="Runs on" description="Pin it to one app, or let each run find one.">
                  <PinSelect action={action} value={pin} onChange={setPin} />
                </FieldBlock>
              )}

              <label className="flex items-center justify-between gap-4 text-sm">
                <span>
                  Enabled
                  <span className="block text-xs text-muted-foreground">
                    A disabled trigger fires nothing.
                  </span>
                </span>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </label>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {trigger ? "Save" : "Create trigger"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};

/**
 * Which signal to wait for. With an action, only the structures it takes
 * are offered (it must be able to receive the object).
 */
const WhenSelect = ({
  declarations,
  value,
  onChange,
}: {
  declarations: SignalDeclarationFragment[];
  value?: SignalWhen;
  onChange: (when: SignalWhen) => void;
}) => (
  <FieldBlock label="When">
    <Select
      value={value ? whenKey(value) : undefined}
      onValueChange={(key) => {
        const declaration = declarations.find((d) => whenKey(d) === key);
        if (declaration) onChange({ identifier: declaration.identifier, kind: declaration.kind });
      }}
    >
      <SelectTrigger className="h-8 w-full">
        <SelectValue placeholder="Choose a signal" />
      </SelectTrigger>
      <SelectContent>
        {declarations.map((declaration) => (
          <SelectItem key={declaration.id} value={whenKey(declaration)}>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-xs">{declaration.identifier}</span>
              <span>is {KIND_LABELS[declaration.kind]}</span>
              <span className="text-xs text-muted-foreground">{declaration.service}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FieldBlock>
);

export const CreateTriggerDialog = (props: {
  action?: string;
  identifier?: string;
  kind?: SignalKind;
}) => {
  const [action, setAction] = useState(props.action);
  const [when, setWhen] = useState<SignalWhen | undefined>(
    props.identifier ? { identifier: props.identifier, kind: props.kind ?? SignalKind.Created } : undefined,
  );

  const { data: declarationData } = useSignalDeclarationsQuery();
  const { data: actionData } = useDetailActionQuery({
    variables: { id: props.action ?? "" },
    skip: !props.action,
  });

  const declarations = useMemo(() => {
    const all = declarationData?.signalDeclarations ?? [];
    if (!props.action) return all;
    const takes = new Set(
      (actionData?.action.args ?? [])
        .filter((port) => port.kind === PortKind.Structure)
        .map((port) => port.identifier),
    );
    return all.filter((declaration) => takes.has(declaration.identifier));
  }, [declarationData, actionData, props.action]);

  if (!declarationData || (props.action && !actionData)) {
    return <LoadingBody title="New trigger" />;
  }

  const declaration = when
    ? declarations.find((d) => whenKey(d) === whenKey(when))
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {!(when && action) && (
        <>
          <DialogHeader>
            <DialogTitle>New trigger</DialogTitle>
            <DialogDescription>Run an action when a service signals a change.</DialogDescription>
          </DialogHeader>
          {declarations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {props.action
                ? "No service signals a structure this action takes."
                : "No service on this hub declares signals yet."}
            </p>
          ) : (
            <WhenSelect declarations={declarations} value={when} onChange={setWhen} />
          )}
          {when && !action && (
            <ActionPicker key={when.identifier} identifier={when.identifier} onPick={setAction} />
          )}
        </>
      )}
      {when && action && (
        <TriggerForm
          key={`${action}:${whenKey(when)}`}
          action={action}
          when={when}
          declaration={declaration}
        />
      )}
    </div>
  );
};

export const EditTriggerDialog = ({ id }: { id: string }) => {
  const { data } = useTriggerQuery({ variables: { id } });
  const trigger = data?.trigger;
  const { data: declarationData } = useSignalDeclarationsQuery({
    variables: { identifier: trigger?.identifier },
    skip: !trigger,
  });
  if (!trigger) return <LoadingBody title="Edit trigger" />;
  const declaration = declarationData?.signalDeclarations.find(
    (d) => d.kind === trigger.kind,
  );
  return (
    <TriggerForm
      action={trigger.action.id}
      when={{ identifier: trigger.identifier, kind: trigger.kind }}
      declaration={declaration}
      trigger={trigger}
    />
  );
};
