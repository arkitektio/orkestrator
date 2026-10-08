import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import {
  RekuestAction,
  RekuestFiring,
  RekuestSignal,
  RekuestTask,
  RekuestTrigger,
} from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { PageAction } from "@/core/ui/page-action";
import { cn } from "@/core/util/utils";
import { useFiringQuery } from "@/rekuest/api/graphql";
import { describeFiring } from "@/rekuest/lib/firing";
import { TaskStatusIcon, statusTheme } from "@/rekuest/lib/taskStatus";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { RotateCcw } from "lucide-react";
import { RuleRow, RuleRows } from "../components/automation/AutomationDetail";
import { REKUEST_HELP } from "../help";

/**
 * One firing: one trigger meeting one signal, and what became of it: the run
 * it started, or why it started none.
 */
export const FiringPage = asDetailQueryRoute(useFiringQuery, ({ data }) => {
  const firing = data.firing;
  const { openDialog } = useDialog();
  const words = describeFiring(firing);
  const { trigger, signal, task } = firing;

  return (
    <RekuestFiring.ModelPage
      title={`${trigger.name}: ${words.label.toLowerCase()}`}
      help={REKUEST_HELP.firing}
      object={firing}
      pageActions={
        <PageAction
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => openDialog("firetrigger", { trigger: trigger.id, signal: signal.id })}
          collapse="icon"
        >
          Fire again
        </PageAction>
      }
    >
      <div className="max-w-5xl space-y-8 p-6">
        <header>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1
              className={cn(
                "text-2xl font-semibold tracking-tight",
                words.tone === "error" && "text-destructive",
              )}
            >
              {words.label}
            </h1>
            <span className="text-sm text-muted-foreground">
              {new Date(firing.createdAt).toLocaleString()}
              {firing.replay && " · by hand"}
            </span>
          </div>
          {firing.reason && (
            <p
              className={cn(
                "mt-2 max-w-3xl text-sm",
                words.tone === "error" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {firing.reason}
            </p>
          )}
        </header>

        <RuleRows>
          <RuleRow label="Trigger">
            <RekuestTrigger.DetailLink object={trigger} className="font-medium hover:underline">
              {trigger.name}
            </RekuestTrigger.DetailLink>
            <span className="ml-2 text-xs text-muted-foreground">
              runs{" "}
              <RekuestAction.DetailLink object={trigger.action} className="hover:text-foreground">
                {trigger.action.name}
              </RekuestAction.DetailLink>
            </span>
          </RuleRow>
          <RuleRow label="Signal">
            <StructureDisplay
              identifier={signal.identifier}
              id={signal.object}
              variant="inline"
              link
              fallback={
                <span className="font-mono text-xs">
                  {signal.identifier} #{signal.object}
                </span>
              }
            />{" "}
            <RekuestSignal.DetailLink
              object={signal}
              className="text-muted-foreground hover:text-foreground"
            >
              was {KIND_LABELS[signal.kind]}
            </RekuestSignal.DetailLink>
            <span className="ml-2 text-xs text-muted-foreground">{signal.serviceName}</span>
          </RuleRow>
          {task && (
            <RuleRow label="Run">
              <RekuestTask.DetailLink
                object={task}
                className="inline-flex items-center gap-1.5 hover:text-primary"
              >
                <TaskStatusIcon
                  kind={task.latestEventKind}
                  isDone={task.isDone}
                  className="h-3.5 w-3.5 shrink-0"
                />
                {statusTheme(task).label}
              </RekuestTask.DetailLink>
            </RuleRow>
          )}
        </RuleRows>
      </div>
    </RekuestFiring.ModelPage>
  );
});

export default FiringPage;
