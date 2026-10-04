import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestAction, RekuestAgent, RekuestSchedule } from "@/core/linkers";
import { toast } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import {
  ScheduleOverlap,
  useScheduleQuery,
  useTriggerScheduleMutation,
  useUpdateScheduleMutation,
} from "@/rekuest/api/graphql";
import { scheduleState } from "@/rekuest/lib/automationStatus";
import { describeCadence } from "@/rekuest/lib/cron";
import { Copy, FastForward, Pause, Pencil, Play } from "lucide-react";
import { useMemo } from "react";
import {
  ArgumentsRow,
  FromRow,
  RuleHeader,
  RuleRow,
  RuleRows,
  UntilRow,
} from "../components/automation/AutomationDetail";
import { initialFromSchedule } from "../components/automation/builder/initial";
import { RunsTable } from "../components/automation/RunsTable";
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

  // The next slots of its timing, as the server reads it: what the timing
  // says, so a paused or ended schedule (which runs none) shows none.
  const upcoming = useMemo(() => {
    if (state === "paused" || state === "ended") return [];
    const format = new Intl.DateTimeFormat(undefined, {
      timeZone: schedule.timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return schedule.upcoming.map((slot: string) => format.format(new Date(slot)));
  }, [state, schedule.upcoming, schedule.timezone]);

  // What the timing does beyond its cadence, said only when it is not the default.
  const timing = [
    schedule.overlap === ScheduleOverlap.Allow && "runs may overlap",
    schedule.catchUp && "missed slots are run late",
  ].filter(Boolean);

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
            disabled={starting || state === "running" || state === "ended"}
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
            onClick={() => openDialog("editschedule", { id: schedule.id })}
            collapse="icon"
            priority={-10}
          >
            Edit
          </PageAction>
          <PageAction
            icon={<Copy className="h-4 w-4" />}
            onClick={() =>
              openDialog("createautomation", {
                initial: { ...initialFromSchedule(schedule), name: `${schedule.name} copy` },
              })
            }
            collapse="menu"
            priority={-20}
          >
            Duplicate
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
        <RuleHeader
          name={schedule.name}
          state={state}
          note={
            state === "waiting" &&
            schedule.nextRun?.notBefore && (
              <span title={new Date(schedule.nextRun.notBefore).toLocaleString()}>
                next run <Timestamp date={schedule.nextRun.notBefore} relative />
              </span>
            )
          }
          description={schedule.description}
          error={
            showError && (
              <>
                {schedule.consecutiveFailures > 1 &&
                  `${schedule.consecutiveFailures} runs failed in a row. `}
                {schedule.lastError}
              </>
            )
          }
          errorAt={schedule.lastErrorAt}
        />

        <RuleRows>
          <RuleRow label="When">
            {describeCadence(schedule)}
            {schedule.cron && (
              <span className="ml-2 font-mono text-xs text-muted-foreground/70">{schedule.cron}</span>
            )}
            {timing.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">{timing.join(" · ")}</span>
            )}
          </RuleRow>
          {upcoming.length > 0 && (
            <RuleRow label="Next">
              <span className="tabular-nums text-muted-foreground">{upcoming.join(" · ")}</span>
            </RuleRow>
          )}
          <UntilRow rule={schedule} />
          <RuleRow label="Do">
            <RekuestAction.DetailLink object={schedule.action} className="font-medium hover:underline">
              {schedule.action.name}
            </RekuestAction.DetailLink>
            {schedule.ephemeralRuns && (
              <span className="ml-2 text-xs text-muted-foreground">runs are not kept</span>
            )}
          </RuleRow>
          <ArgumentsRow action={schedule.action.id} args={schedule.args} />
          <RuleRow label="Where">
            {schedule.agent ? (
              <RekuestAgent.DetailLink object={schedule.agent} className="hover:underline">
                {schedule.agent.name}
                {schedule.interface && (
                  <span className="ml-2 text-xs text-muted-foreground">{schedule.interface}</span>
                )}
              </RekuestAgent.DetailLink>
            ) : (
              "Any app that implements it"
            )}
          </RuleRow>
          {schedule.caller.user.sub && (
            <RuleRow label="Runs as">
              <StructureDisplay identifier="@lok/user" id={schedule.caller.user.sub} variant="inline" />
            </RuleRow>
          )}
          <FromRow rule={schedule} />
        </RuleRows>

        <RunsTable runs={schedule.runs} />
      </div>
    </RekuestSchedule.ModelPage>
  );
});

export default SchedulePage;
