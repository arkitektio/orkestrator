import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestAction, RekuestAgent, RekuestTrigger } from "@/core/linkers";
import { toast } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Badge } from "@/core/ui/badge";
import { PageAction } from "@/core/ui/page-action";
import { useTriggerQuery, useUpdateTriggerMutation } from "@/rekuest/api/graphql";
import { triggerState } from "@/rekuest/lib/automationStatus";
import {
  KIND_LABELS,
  describeCondition,
  fromWireConditions,
} from "@/rekuest/lib/triggerConditions";
import { Copy, Pause, Pencil, Play, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ArgumentsRow,
  FromRow,
  RuleHeader,
  RuleRow,
  RuleRows,
  UntilRow,
} from "../components/automation/AutomationDetail";
import { initialFromTrigger } from "../components/automation/builder/initial";
import { FiringsTable } from "../components/automation/FiringsTable";
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
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => openDialog("firetrigger", { trigger: trigger.id })}
            collapse="icon"
            priority={-5}
          >
            Fire on a signal…
          </PageAction>
          <PageAction
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("edittrigger", { id: trigger.id })}
            collapse="icon"
            priority={-10}
          >
            Edit
          </PageAction>
          <PageAction
            icon={<Copy className="h-4 w-4" />}
            onClick={() =>
              openDialog("createautomation", {
                initial: { ...initialFromTrigger(trigger), name: `${trigger.name} copy` },
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
            <RekuestTrigger.Knowledge object={trigger} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="max-w-5xl space-y-8 p-6">
        <RuleHeader
          name={trigger.name}
          state={state}
          description={trigger.description}
          errorAt={trigger.lastErrorAt}
          error={
            state === "failing" &&
            trigger.lastError && (
              <>
                {trigger.consecutiveFailures > 1 &&
                  `${trigger.consecutiveFailures} firings in a row created no run. `}
                {trigger.lastError}
              </>
            )
          }
        />

        <RuleRows>
          <RuleRow label="When">
            <span className="font-mono text-xs">{trigger.identifier}</span> is{" "}
            {KIND_LABELS[trigger.kind]}
            {trigger.debounceSeconds != null && (
              <span className="ml-2 text-xs text-muted-foreground">
                at most once per object every {trigger.debounceSeconds}s
              </span>
            )}
          </RuleRow>
          {conditions.length > 0 && (
            <RuleRow label="Only if">
              <div className="flex flex-wrap gap-1">
                {conditions.map((condition, index) => (
                  <Badge key={index} variant="outline" className="font-mono text-[11px] font-normal">
                    {describeCondition(condition)}
                  </Badge>
                ))}
              </div>
            </RuleRow>
          )}
          <UntilRow rule={trigger} />
          <RuleRow label="Do">
            <RekuestAction.DetailLink object={trigger.action} className="font-medium hover:underline">
              {trigger.action.name}
            </RekuestAction.DetailLink>
          </RuleRow>
          <ArgumentsRow
            action={trigger.action.id}
            args={trigger.args}
            receiving={{ port: trigger.port, identifier: trigger.identifier }}
          />
          <RuleRow label="Where">
            {trigger.agent ? (
              <RekuestAgent.DetailLink object={trigger.agent} className="hover:underline">
                {trigger.agent.name}
                {trigger.interface && (
                  <span className="ml-2 text-xs text-muted-foreground">{trigger.interface}</span>
                )}
              </RekuestAgent.DetailLink>
            ) : (
              "Any app that implements it"
            )}
          </RuleRow>
          {trigger.caller.user.sub && (
            <RuleRow label="Runs as">
              <StructureDisplay identifier="@lok/user" id={trigger.caller.user.sub} variant="inline" />
            </RuleRow>
          )}
          <FromRow rule={trigger} />
        </RuleRows>

        <div>
          <FiringsTable firings={trigger.firings} hide="trigger" />
          {trigger.firings.length > 0 && (
            <Link
              to={`/rekuest/firings?trigger=${trigger.id}`}
              className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground"
            >
              All firings
            </Link>
          )}
        </div>
      </div>
    </RekuestTrigger.ModelPage>
  );
});

export default TriggerPage;
