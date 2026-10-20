import { useDialog } from "@/core/dialogs/registry";
import { RekuestTask } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { PythonFlowStatus } from "@/fluss/api/graphql";
import { Play, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePythonFlowDeployments } from "./deployments";

/**
 * Run a published version: through the assign form of where it is deployed,
 * or, not deployed yet, through Deploy first.
 */
export const RunPythonFlowButton = (props: { flow: { id: string; status: PythonFlowStatus } }) => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  const { data } = usePythonFlowDeployments(props.flow.id);
  const deployment =
    data?.implementations.find((impl) => impl.agent.active) ?? data?.implementations.at(0);
  const published = props.flow.status === PythonFlowStatus.Published;

  if (!published) return null;

  if (!deployment) {
    return (
      <PageAction
        size="sm"
        variant="outline"
        icon={<Rocket className="h-4 w-4" />}
        onClick={() => openDialog("deploypythonflow", { flow: props.flow.id, runAfter: true }, { size: "medium" })}
      >
        Deploy and run
      </PageAction>
    );
  }

  return (
    <PageAction
      size="sm"
      icon={<Play className="h-4 w-4" />}
      onClick={() =>
        openDialog("assign", {
          target: { implementation: deployment.id },
          onAssigned: (task) => navigate(RekuestTask.linkBuilder(task.id)),
        })
      }
    >
      Run
    </PageAction>
  );
};
