import { useListImplementationsQuery } from "@/rekuest/api/graphql";
import { flowInterface } from "./utils";

/** The interface of fluss's generic graph runner, the action a deployed flow wraps. */
export const FLOW_RUNNER_INTERFACE = "run_flow";

/** Where flow `flowId` is deployed: one implementation per runner agent it was deployed to. */
export const useFlowDeployments = (flowId: string) =>
  useListImplementationsQuery({
    variables: { filters: { interface: { exact: flowInterface(flowId) } } },
    fetchPolicy: "cache-and-network",
  });

/** The agents that can run graph flows: every `run_flow` implementation. */
export const useFlowRunners = () =>
  useListImplementationsQuery({
    variables: { filters: { interface: { exact: FLOW_RUNNER_INTERFACE } } },
    fetchPolicy: "cache-and-network",
  });
