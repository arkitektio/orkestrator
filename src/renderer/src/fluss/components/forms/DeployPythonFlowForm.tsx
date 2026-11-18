import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { PythonFlowStatus, usePythonFlowQuery } from "@/fluss/api/graphql";
import { PYTHON_RUNNER_INTERFACE, usePythonFlowDeployments, usePythonRunners } from "@/fluss/python/deployments";
import {
  pythonFlowDeployConfig,
  pythonFlowInterface,
  pythonFlowStatefulSteps,
  pythonFlowToDefinition,
  type StepActions,
} from "@/fluss/utils";
import { useCallback, useMemo } from "react";
import { DeployOnRunnerForm } from "./DeployOnRunnerForm";

const NO_MANIFEST: never[] = [];

/**
 * Make a published Python flow version an action of its own: deployed onto
 * the agent of a `run_python_flow` runner, whose action it wraps with the
 * version bound (fluss's `adeploy_python_flow`).
 */
export const DeployPythonFlowForm = (props: { flow: string; runAfter?: boolean }) => {
  const { data } = usePythonFlowQuery({ variables: { id: props.flow } });
  const flow = data?.pythonFlow;
  const manifest = flow?.manifest ?? NO_MANIFEST;

  const stepHashes = useMemo(() => [...new Set(manifest.map((entry) => entry.actionHash))], [manifest]);
  const statefulSteps = useCallback((actions: StepActions) => pythonFlowStatefulSteps(manifest, actions), [manifest]);
  const deployment = useMemo(
    () =>
      flow && {
        interface: pythonFlowInterface(flow.id),
        definition: pythonFlowToDefinition(flow),
        config: pythonFlowDeployConfig(flow.id),
      },
    [flow],
  );

  return (
    <DeployOnRunnerForm
      header={
        <DialogHeader>
          <DialogTitle>Deploy {flow?.title ?? "Python flow"}</DialogTitle>
          <DialogDescription>
            The flow becomes an action of its own, with the arguments and returns of its{" "}
            <span className="font-mono">main</span>. It runs on the agent you pick, which hosts fluss&apos;s Python flow runner.
          </DialogDescription>
        </DialogHeader>
      }
      refused={
        flow && flow.status !== PythonFlowStatus.Published
          ? "Only a published version can be deployed. Publish this one first."
          : undefined
      }
      runners={usePythonRunners()}
      deployments={usePythonFlowDeployments(props.flow)}
      noRunner={
        <>
          No agent can run Python flows yet. Start an app that registers fluss&apos;s{" "}
          <span className="font-mono">{PYTHON_RUNNER_INTERFACE}</span> (the fluss client, with its Python extra).
        </>
      }
      stepHashes={stepHashes}
      statefulSteps={statefulSteps}
      stepLabel={(step) => <span className="font-mono">{step.key}</span>}
      deployment={deployment}
      runAfter={props.runAfter}
    />
  );
};
