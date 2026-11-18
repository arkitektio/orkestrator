import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { useFlowQuery } from "@/fluss/api/graphql";
import { FLOW_RUNNER_INTERFACE, useFlowDeployments, useFlowRunners } from "@/fluss/deployments";
import {
  flowDeployConfig,
  flowInterface,
  flowStatefulSteps,
  flowStepHashes,
  flowToDefinition,
  type StepActions,
} from "@/fluss/utils";
import { useCallback, useMemo } from "react";
import { DeployOnRunnerForm } from "./DeployOnRunnerForm";

const NO_NODES: never[] = [];

/**
 * Make a graph flow an action of its own: deployed onto the agent of a
 * `run_flow` runner, whose action it wraps with the flow bound (fluss's
 * `adeploy_flow`). It takes the flow's own arguments and yields its returns.
 */
export const DeployFlowForm = (props: { flow: string; runAfter?: boolean }) => {
  const { data } = useFlowQuery({ variables: { id: props.flow } });
  const flow = data?.flow;
  const nodes = flow?.graph.nodes ?? NO_NODES;

  const stepHashes = useMemo(() => flowStepHashes(nodes), [nodes]);
  const statefulSteps = useCallback((actions: StepActions) => flowStatefulSteps(nodes, actions), [nodes]);
  const deployment = useMemo(
    () =>
      flow && {
        interface: flowInterface(flow.id),
        definition: flowToDefinition(flow),
        config: flowDeployConfig(flow.id),
      },
    [flow],
  );

  return (
    <DeployOnRunnerForm
      header={
        <DialogHeader>
          <DialogTitle>Deploy {flow?.title ?? "flow"}</DialogTitle>
          <DialogDescription>
            The flow becomes an action of its own, with the arguments its argument node hands out (and its globals) and
            the returns its return node takes. It runs on the agent you pick, which hosts fluss&apos;s flow runner.
          </DialogDescription>
        </DialogHeader>
      }
      runners={useFlowRunners()}
      deployments={useFlowDeployments(props.flow)}
      noRunner={
        <>
          No agent can run flows yet. Start an app that registers fluss&apos;s{" "}
          <span className="font-mono">{FLOW_RUNNER_INTERFACE}</span> (the fluss client, with its engine extra).
        </>
      }
      stepHashes={stepHashes}
      statefulSteps={statefulSteps}
      stepLabel={(step) => step.name}
      deployment={deployment}
      runAfter={props.runAfter}
    />
  );
};
