import { useDialog } from "@/core/dialogs/registry";
import { RekuestTask } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import type { ListImplementationsQuery } from "@/rekuest/api/graphql";
import { Play, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Run a flow: through the assign form of where it is deployed (a live agent
 * first), or, not deployed yet, through Deploy first.
 */
export const RunDeployedButton = (props: {
  /** Where it is deployed: the implementations of its interface. */
  deployments: ListImplementationsQuery | undefined;
  /** Opens its deploy dialog, to run once deployed. */
  onDeployAndRun: () => void;
}) => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  const deployment =
    props.deployments?.implementations.find((impl) => impl.agent.active) ?? props.deployments?.implementations.at(0);

  if (!deployment) {
    return (
      <PageAction size="sm" variant="outline" icon={<Rocket className="h-4 w-4" />} onClick={props.onDeployAndRun}>
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
