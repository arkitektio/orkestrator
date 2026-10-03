import { useDialog } from "@/core/dialogs/registry";
import { RekuestSchedule } from "@/core/linkers";
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
import { Skeleton } from "@/core/ui/skeleton";
import { Switch } from "@/core/ui/switch";
import {
  DetailScheduleFragment,
  useCreateScheduleMutation,
  useDetailActionQuery,
  useScheduleQuery,
  useUpdateScheduleMutation,
} from "@/rekuest/api/graphql";
import {
  CadenceDraft,
  cadenceFromSchedule,
  cadenceToInput,
  defaultCadence,
} from "@/rekuest/lib/cron";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionPicker } from "../components/automation/ActionPicker";
import { FieldBlock } from "../components/automation/FieldBlock";
import { Pin, PinSelect } from "../components/automation/PinSelect";
import { SchedulePanel } from "../components/automation/SchedulePanel";

const LoadingBody = ({ title }: { title: string }) => (
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

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** A query the dialog stands on failed: say so, rather than load forever. */
const ErrorBody = ({
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

/**
 * Save a recurring run of an action: its arguments, when it runs, and
 * optionally the app it always runs on. Editing keeps the action and the
 * pin (the backend does not change those); everything else can move.
 */
const ScheduleForm = ({
  action,
  schedule,
}: {
  action: string;
  schedule?: DetailScheduleFragment;
}) => {
  const { data, error, refetch } = useDetailActionQuery({ variables: { id: action } });
  const detail = data?.action;
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const { registry } = useWidgetRegistry();

  const form = usePortForm({
    ports: detail?.args ?? [],
    overwrites: schedule?.args ?? undefined,
  });

  const [name, setName] = useState(schedule?.name ?? "");
  const [cadence, setCadence] = useState<CadenceDraft>(() =>
    schedule ? cadenceFromSchedule(schedule) : defaultCadence(),
  );
  const [pin, setPin] = useState<Pin | null>(null);
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [ephemeralRuns, setEphemeralRuns] = useState(false);

  const [create] = useCreateScheduleMutation({ refetchQueries: ["ListSchedules"] });
  const [update] = useUpdateScheduleMutation();

  const title = schedule ? "Edit schedule" : "New schedule";
  if (!detail && error) return <ErrorBody title={title} error={error} onRetry={() => refetch()} />;
  if (!detail) return <LoadingBody title={title} />;

  const onSubmit = async (args: Record<string, unknown>) => {
    const checked = cadenceToInput(cadence);
    if (!checked.ok) {
      toast.error(checked.error);
      return;
    }
    const finalName = name.trim() || detail.name;
    try {
      if (schedule) {
        await update({
          variables: {
            input: { id: schedule.id, name: finalName, args, enabled, ...checked.input },
          },
        });
        closeDialog();
        return;
      }
      const result = await create({
        variables: {
          input: {
            action,
            name: finalName,
            args,
            enabled,
            ephemeralRuns,
            agent: pin?.agent ?? null,
            interface: pin?.interface ?? null,
            ...checked.input,
          },
        },
      });
      closeDialog();
      const id = result.data?.createSchedule.id;
      if (id) navigate(RekuestSchedule.linkBuilder(id));
    } catch (error) {
      toast.error(`Could not save the schedule: ${errorMessage(error)}`);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{schedule ? "Edit schedule" : "New schedule"}</DialogTitle>
        <DialogDescription>
          Run <span className="font-medium text-foreground">{detail.name}</span> on a clock.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* What runs on the left, when on the right; one column when narrow. */}
          <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
          {/* max-h on the viewport: on the root it constrains nothing and the
              fields spill over the footer buttons */}
          <ScrollArea className="-mr-3 pr-3 [&>[data-slot=scroll-area-viewport]]:max-h-[62vh]">
            <div className="flex flex-col gap-6">
              {detail.args.length > 0 && (
                <FieldBlock
                  label="Arguments"
                  description="Every run is assigned with these."
                >
                  <ArgsContainer
                    registry={registry}
                    groups={detail.portGroups ?? []}
                    ports={detail.args}
                    path={[]}
                  />
                </FieldBlock>
              )}

              <FieldBlock label="Name">
                <Input
                  className="h-8"
                  value={name}
                  placeholder={detail.name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FieldBlock>

              {schedule ? (
                schedule.agent && (
                  <FieldBlock label="Runs on">
                    <p className="text-sm">
                      {schedule.agent.name}
                      <span className="ml-2 text-muted-foreground">{schedule.interface}</span>
                    </p>
                  </FieldBlock>
                )
              ) : (
                <FieldBlock
                  label="Runs on"
                  description="Pin it to one app, or let each run find one."
                >
                  <PinSelect action={action} value={pin} onChange={setPin} />
                </FieldBlock>
              )}

              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    Enabled
                    <span className="block text-xs text-muted-foreground">
                      A paused schedule creates no runs.
                    </span>
                  </span>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </label>
                {!schedule && (
                  <label className="flex items-center justify-between gap-4 text-sm">
                    <span>
                      Ephemeral runs
                      <span className="block text-xs text-muted-foreground">
                        Runs are not kept in your task history.
                      </span>
                    </span>
                    <Switch checked={ephemeralRuns} onCheckedChange={setEphemeralRuns} />
                  </label>
                )}
              </div>
            </div>
          </ScrollArea>
          <SchedulePanel value={cadence} onChange={setCadence} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {schedule ? "Save" : "Create schedule"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};

export const CreateScheduleDialog = (props: { action?: string }) => {
  const [action, setAction] = useState(props.action);

  if (!action) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>New schedule</DialogTitle>
          <DialogDescription>Which action should run on a clock?</DialogDescription>
        </DialogHeader>
        <ActionPicker onPick={setAction} />
      </div>
    );
  }
  return <ScheduleForm key={action} action={action} />;
};

export const EditScheduleDialog = ({ id }: { id: string }) => {
  const { data, error, refetch } = useScheduleQuery({ variables: { id } });
  if (!data && error) {
    return <ErrorBody title="Edit schedule" error={error} onRetry={() => refetch()} />;
  }
  if (!data) return <LoadingBody title="Edit schedule" />;
  return <ScheduleForm action={data.schedule.action.id} schedule={data.schedule} />;
};
