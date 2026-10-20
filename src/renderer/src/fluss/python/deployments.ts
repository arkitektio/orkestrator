import { useListImplementationsQuery } from "@/rekuest/api/graphql";
import { pythonFlowInterface } from "../utils";

/** The interface of fluss's generic executor, the action a deployed version wraps. */
export const PYTHON_RUNNER_INTERFACE = "run_python_flow";

/** Where version `flowId` is deployed: one implementation per runner agent it was deployed to. */
export const usePythonFlowDeployments = (flowId: string) =>
  useListImplementationsQuery({
    variables: { filters: { interface: { exact: pythonFlowInterface(flowId) } } },
    fetchPolicy: "cache-and-network",
  });

/** The agents that can run Python flows: every `run_python_flow` implementation. */
export const usePythonRunners = () =>
  useListImplementationsQuery({
    variables: { filters: { interface: { exact: PYTHON_RUNNER_INTERFACE } } },
    fetchPolicy: "cache-and-network",
  });
