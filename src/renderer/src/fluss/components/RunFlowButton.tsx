import { useDialog } from "@/core/dialogs/registry";
import { useFlowDeployments } from "../deployments";
import { RunDeployedButton } from "./RunDeployedButton";

/**
 * Run a graph flow: through the assign form of where it is deployed, or, not
 * deployed yet, through Deploy first. A saved flow is a version of its own:
 * what runs is this one, as it was saved.
 */
export const RunFlowButton = (props: { flow: { id: string } }) => {
  const { openDialog } = useDialog();
  const { data } = useFlowDeployments(props.flow.id);

  return (
    <RunDeployedButton
      deployments={data}
      onDeployAndRun={() => openDialog("deployflow", { flow: props.flow.id, runAfter: true }, { size: "medium" })}
    />
  );
};
