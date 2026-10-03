import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestAction, RekuestAgent, RekuestSchedule } from "@/core/linkers";
import { toast } from "@/core/notify";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import {
  useScheduleQuery,
  useTriggerScheduleMutation,
  useUpdateScheduleMutation,
} from "@/rekuest/api/graphql";
import { scheduleState } from "@/rekuest/lib/automationStatus";
import { describeCadence } from "@/rekuest/lib/cron";
import { FastForward, Pause, Pencil, Play } from "lucide-react";
import { AutomationStatus } from "../components/automation/AutomationStatus";
import { RunsGrid } from "../components/automation/RunsGrid";
import { SavedArgs } from "../components/automation/SavedArgs";
import { REKUEST_HELP } from "../help";

export const SchedulePage = asDetailQueryRoute(useScheduleQuery, ({ data, refetch }) => {
  const schedule = data.schedule;
  const state = scheduleState(schedule);
  const { openDialog } = useDialog();
  const [update, { loading: updating }] = useUpdateScheduleMutation();
  const [runNow, { loading: starting }] = useTriggerScheduleMutation();

  const setEnabled = (enabled: boolean) =>
    update({ variables: { input: { id: schedule.id, enabled } } }).catch((error) =>
      toast.error(`Could not ${enabled ? "resume" : "pause"}: ${error.message}`),
    );

  const startNow = () =>
    runNow({ variables: { id: schedule.id } }).then(
      () => {
        toast.success(`${schedule.name} started`);
        refetch();
      },
      (error) => toast.error(`Could not start it: ${error.message}`),
    );

  const showError =
    schedule.lastError && (state === "failing" || (state === "idle" && schedule.enabled));

  return (
    <RekuestSchedule.ModelPage
      title={schedule.name}
      help={REKUEST_HELP.schedule}
      object={schedule}
      pageActions={
        <>
          <PageAction
            icon={<FastForward className="h-4 w-4" />}
            onClick={startNow}
            disabled={starting || state === "running"}
            collapse="icon"
          >
            Run now
          </PageAction>
          <PageAction
            icon={schedule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            onClick={() => setEnabled(!schedule.enabled)}
            disabled={updating}
            collapse="icon"
          >
            {schedule.enabled ? "Pause" : "Resume"}
          </PageAction>
          <PageAction
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("editschedule", { id: schedule.id }, { size: "large" })}
            collapse="icon"
            priority={-10}
          >
            Edit
          </PageAction>
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestSchedule.Knowledge object={schedule} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="max-w-5xl space-y-8 p-6">
        <header>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <RekuestAction.DetailLink object={schedule.action} className="hover:underline">
              {schedule.action.name}
            </RekuestAction.DetailLink>
            {schedule.agent && (
              <>
                <span>on</span>
                <RekuestAgent.DetailLink object={schedule.agent} className="hover:underline">
                  {schedule.agent.name}
                </RekuestAgent.DetailLink>
              </>
            )}
            {schedule.ephemeralRuns && <span>· ephemeral runs</span>}
          </div>
          <h1 className="mt-1 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {schedule.name}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            {describeCadence(schedule)}
            {schedule.cron && (
              <span className="ml-3 font-mono text-sm text-muted-foreground/60">{schedule.cron}</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <AutomationStatus state={state} className="text-sm" />
            {state === "waiting" && schedule.nextRun?.notBefore && (
              <span title={new Date(schedule.nextRun.notBefore).toLocaleString()}>
                next run <Timestamp date={schedule.nextRun.notBefore} relative />
              </span>
            )}
          </div>
          {showError && (
            <p className="mt-3 max-w-3xl text-sm text-destructive">
              {schedule.consecutiveFailures > 1 &&
                `${schedule.consecutiveFailures} runs failed in a row. `}
              {schedule.lastError}
            </p>
          )}
        </header>

        <SavedArgs args={schedule.args} />

        <RunsGrid runs={schedule.runs} />
      </div>
    </RekuestSchedule.ModelPage>
  );
});

export default SchedulePage;
