import { useDialog } from "@/core/dialogs/registry";
import { PythonFlowStatus } from "@/fluss/api/graphql";
import { RunDeployedButton } from "../components/RunDeployedButton";
import { usePythonFlowDeployments } from "./deployments";

/**
 * Run a published version: through the assign form of where it is deployed,
 * or, not deployed yet, through Deploy first.
 */
export const RunPythonFlowButton = (props: { flow: { id: string; status: PythonFlowStatus } }) => {
  const { openDialog } = useDialog();
  const { data } = usePythonFlowDeployments(props.flow.id);

  if (props.flow.status !== PythonFlowStatus.Published) return null;

  return (
    <RunDeployedButton
      deployments={data}
      onDeployAndRun={() => openDialog("deploypythonflow", { flow: props.flow.id, runAfter: true }, { size: "medium" })}
    />
  );
};
