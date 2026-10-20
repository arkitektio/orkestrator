import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { DialogError } from "@/core/dialogs/DialogError";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { cn } from "@/core/util/utils";
import { PythonFlowStatus, usePythonFlowQuery } from "@/fluss/api/graphql";
import { PYTHON_RUNNER_INTERFACE, usePythonFlowDeployments, usePythonRunners } from "@/fluss/python/deployments";
import { pythonFlowDeployConfig, pythonFlowInterface, pythonFlowToDefinition } from "@/fluss/utils";
import {
  ListImplementationsDocument,
  useCreateHigherOrderImplementationMutation,
} from "@/rekuest/api/graphql";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * Make a published Python flow version an action of its own: deployed onto
 * the agent of a `run_python_flow` runner, whose action it wraps with the
 * version bound (fluss's `adeploy_python_flow`). Deploying again to the same
 * agent updates that action in place.
 */
export const DeployPythonFlowForm = (props: { flow: string; runAfter?: boolean }) => {
  const { openDialog } = useDialog();
  const { data, loading } = usePythonFlowQuery({ variables: { id: props.flow } });
  const runners = usePythonRunners();
  const deployments = usePythonFlowDeployments(props.flow);
  const [runner, setRunner] = useState<string | null>(null);
  const [deploy] = useCreateHigherOrderImplementationMutation({
    refetchQueries: [ListImplementationsDocument],
  });

  const flow = data?.pythonFlow;
  const deployedOn = new Set(deployments.data?.implementations.map((impl) => impl.agent.name) ?? []);
  const options = runners.data?.implementations ?? [];
  const chosen = runner ?? options.find((impl) => impl.agent.active)?.id ?? options.at(0)?.id ?? null;

  const { submit, submitting } = useDialogSubmit(
    async () => {
      if (!flow || !chosen) throw new Error("Pick an agent to deploy to");
      const result = await deploy({
        variables: {
          input: {
            lower: chosen,
            interface: pythonFlowInterface(flow.id),
            definition: pythonFlowToDefinition(flow),
            config: pythonFlowDeployConfig(flow.id),
          },
        },
      });
      return result.data?.createHigherOrderImplementation;
    },
    {
      errorTitle: "Couldn't deploy the flow",
      onSuccess: (implementation) => {
        if (props.runAfter && implementation) {
          // The assign dialog replaces this one.
          setTimeout(() => openDialog("assign", { target: { implementation: implementation.id } }), 0);
        }
      },
    },
  );

  const published = flow?.status === PythonFlowStatus.Published;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Deploy {flow?.title ?? "Python flow"}</DialogTitle>
        <DialogDescription>
          The flow becomes an action of its own, with the arguments and returns of its{" "}
          <span className="font-mono">main</span>. It runs on the agent you pick, which hosts fluss&apos;s Python flow runner.
        </DialogDescription>
      </DialogHeader>

      {flow && !published && (
        <div className="text-sm text-destructive">Only a published version can be deployed. Publish this one first.</div>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</div>
        {(loading || runners.loading) && options.length === 0 && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!runners.loading && options.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No agent can run Python flows yet. Start an app that registers fluss&apos;s{" "}
            <span className="font-mono">{PYTHON_RUNNER_INTERFACE}</span> (the fluss client, with its Python extra).
          </div>
        )}
        {options.map((impl) => (
          <button
            key={impl.id}
            type="button"
            onClick={() => setRunner(impl.id)}
            className={cn(
              "flex items-center gap-2 rounded border px-3 py-2 text-left text-sm",
              impl.id === chosen ? "border-primary bg-primary/5" : "hover:bg-muted/60",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", impl.agent.active ? "bg-green-500" : "bg-muted-foreground/40")} />
            <span className="flex-1 truncate">{impl.agent.name}</span>
            {!impl.agent.active && <span className="text-xs text-muted-foreground">offline</span>}
            {deployedOn.has(impl.agent.name) && <span className="text-xs text-muted-foreground">deployed</span>}
            {impl.id === chosen && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>

      <DialogError />
      <DialogFooter>
        <Button onClick={() => void submit()} disabled={!published || !chosen || submitting}>
          {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {props.runAfter ? "Deploy and run" : "Deploy"}
        </Button>
      </DialogFooter>
    </div>
  );
};
