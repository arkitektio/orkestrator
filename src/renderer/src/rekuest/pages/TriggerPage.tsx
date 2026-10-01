import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestAction, RekuestAgent, RekuestTrigger } from "@/core/linkers";
import { toast } from "@/core/notify";
import { PageAction } from "@/core/ui/page-action";
import { useTriggerQuery, useUpdateTriggerMutation } from "@/rekuest/api/graphql";
import { triggerState } from "@/rekuest/lib/automationStatus";
import {
  KIND_LABELS,
  describeCondition,
  fromWireConditions,
} from "@/rekuest/lib/triggerConditions";
import { Pause, Pencil, Play } from "lucide-react";
import { AutomationStatus } from "../components/automation/AutomationStatus";
import { RunsGrid } from "../components/automation/RunsGrid";
import { SavedArgs } from "../components/automation/SavedArgs";
import { REKUEST_HELP } from "../help";

export const TriggerPage = asDetailQueryRoute(useTriggerQuery, ({ data }) => {
  const trigger = data.trigger;
  const state = triggerState(trigger);
  const conditions = fromWireConditions(trigger.conditions);
  const { openDialog } = useDialog();
  const [update, { loading: updating }] = useUpdateTriggerMutation();

  const setEnabled = (enabled: boolean) =>
    update({ variables: { input: { id: trigger.id, enabled } } }).catch((error) =>
      toast.error(`Could not ${enabled ? "enable" : "disable"}: ${error.message}`),
    );

  return (
    <RekuestTrigger.ModelPage
      title={trigger.name}
      help={REKUEST_HELP.trigger}
      object={trigger}
      pageActions={
        <>
          <PageAction
            icon={trigger.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            onClick={() => setEnabled(!trigger.enabled)}
            disabled={updating}
            collapse="icon"
          >
            {trigger.enabled ? "Disable" : "Enable"}
          </PageAction>
          <PageAction
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("edittrigger", { id: trigger.id }, { size: "medium" })}
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
            <RekuestTrigger.Knowledge object={trigger} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="max-w-5xl space-y-8 p-6">
        <header>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {trigger.name}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            When a <span className="font-mono text-foreground">{trigger.identifier}</span> is{" "}
            {KIND_LABELS[trigger.kind]}
            {conditions.length > 0 && (
              <> and {conditions.map(describeCondition).join(" and ")}</>
            )}
            , run{" "}
            <RekuestAction.DetailLink object={trigger.action} className="text-foreground hover:underline">
              {trigger.action.name}
            </RekuestAction.DetailLink>{" "}
            with it as <span className="font-mono text-foreground">{trigger.port}</span>
            {trigger.agent && (
              <>
                {" "}on{" "}
                <RekuestAgent.DetailLink object={trigger.agent} className="text-foreground hover:underline">
                  {trigger.agent.name}
                </RekuestAgent.DetailLink>
              </>
            )}
            .
          </p>
          <div className="mt-3 flex items-center gap-3">
            <AutomationStatus state={state} className="text-sm" />
          </div>
          {state === "failing" && trigger.lastError && (
            <p className="mt-3 max-w-3xl text-sm text-destructive">
              {trigger.consecutiveFailures > 1 &&
                `${trigger.consecutiveFailures} firings in a row created no run. `}
              {trigger.lastError}
            </p>
          )}
        </header>

        <SavedArgs args={trigger.args} skip={trigger.port} />

        <RunsGrid runs={trigger.runs} />
      </div>
    </RekuestTrigger.ModelPage>
  );
});

export default TriggerPage;
