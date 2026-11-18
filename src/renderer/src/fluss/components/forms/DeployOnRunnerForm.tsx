import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { cn } from "@/core/util/utils";
import type { StepActions } from "@/fluss/utils";
import {
  ActionStatefulByHashDocument,
  ActionStatefulByHashQuery,
  ActionStatefulByHashQueryVariables,
  AgentDependencyInput,
  CreateHigherOrderImplementationInput,
  ListImplementationsDocument,
  ListImplementationsQuery,
  useCreateHigherOrderImplementationMutation,
} from "@/rekuest/api/graphql";
import { useRekuest } from "@/rekuest/api/hooks";
import { Check, Loader2 } from "lucide-react";
import { ReactNode, useCallback, useEffect, useState } from "react";

type Implementations = { data?: ListImplementationsQuery; loading?: boolean };

export type DeployOnRunnerFormProps = {
  /** The dialog's own header: each deploy dialog names what it deploys. */
  header: ReactNode;
  /** Why it cannot be deployed as it is, when it cannot. */
  refused?: ReactNode;
  /** The implementations of the runner it is deployed onto, one per agent. */
  runners: Implementations;
  /** Where it is deployed already. */
  deployments: Implementations;
  /** What to start when no agent offers the runner. */
  noRunner: ReactNode;
  /** The action hashes of its steps: the same list while nothing changed. */
  stepHashes: readonly string[];
  /** The dependencies its stateful steps are, once their actions are looked up. */
  statefulSteps: (actionsByHash: StepActions) => AgentDependencyInput[];
  /** How a stateful step is called in its line. */
  stepLabel: (step: AgentDependencyInput) => ReactNode;
  /** The action it becomes; undefined while what is deployed is not read yet. */
  deployment: Pick<CreateHigherOrderImplementationInput, "interface" | "definition" | "config"> | undefined;
  /** Open the assign form on what was deployed. */
  runAfter?: boolean;
};

/**
 * Make a flow an action of its own: deployed onto the agent of a runner, whose
 * action it wraps with the flow bound (a rekuest higher-order implementation).
 * Deploying again to the same agent updates that action in place.
 *
 * Its stateful steps become dependencies of that action: starting the flow
 * binds each to an agent.
 */
export const DeployOnRunnerForm = (props: DeployOnRunnerFormProps) => {
  const { stepHashes, statefulSteps: stepsOf } = props;
  const { openDialog } = useDialog();
  const rekuest = useRekuest();
  const [runner, setRunner] = useState<string | null>(null);
  const [deploy] = useCreateHigherOrderImplementationMutation({
    refetchQueries: [ListImplementationsDocument],
  });

  // Whether a step keeps state is its action's, looked up by hash. A hash names one definition,
  // so the cache answers the deploy's lookup after the form's own.
  const lookUpStatefulSteps = useCallback(async () => {
    if (!rekuest) throw new Error("Rekuest is not available");
    const actions = await Promise.all(
      stepHashes.map(async (hash) => {
        const found = await rekuest.query<ActionStatefulByHashQuery, ActionStatefulByHashQueryVariables>({
          query: ActionStatefulByHashDocument,
          variables: { hash },
        });
        return [hash, found.data.action] as const;
      }),
    );
    return stepsOf(Object.fromEntries(actions));
  }, [rekuest, stepHashes, stepsOf]);

  const [statefulSteps, setStatefulSteps] = useState<AgentDependencyInput[]>([]);
  useEffect(() => {
    let current = true;
    lookUpStatefulSteps().then(
      (steps) => current && setStatefulSteps(steps),
      // Shown only: a step that cannot be looked up fails the deploy, which says why.
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [lookUpStatefulSteps]);

  const deployedOn = new Set(props.deployments.data?.implementations.map((impl) => impl.agent.name) ?? []);
  const options = props.runners.data?.implementations ?? [];
  const chosen = runner ?? options.find((impl) => impl.agent.active)?.id ?? options.at(0)?.id ?? null;
  const deployment = props.deployment;

  const { submit, submitting } = useDialogSubmit(
    async () => {
      if (!deployment || !chosen) throw new Error("Pick an agent to deploy to");
      const result = await deploy({
        variables: {
          input: {
            lower: chosen,
            ...deployment,
            // Always sent, empty when there are none: a redeploy says what the flow holds now.
            dependencies: await lookUpStatefulSteps(),
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

  return (
    <div className="flex flex-col gap-4">
      {props.header}

      {props.refused && <div className="text-sm text-destructive">{props.refused}</div>}

      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent</div>
        {(!deployment || props.runners.loading) && options.length === 0 && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!props.runners.loading && options.length === 0 && (
          <div className="text-sm text-muted-foreground">{props.noRunner}</div>
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
            <span className={cn("h-2 w-2 rounded-full", impl.agent.active ? "bg-success" : "bg-muted-foreground/40")} />
            <span className="flex-1 truncate">{impl.agent.name}</span>
            {!impl.agent.active && <span className="text-xs text-muted-foreground">offline</span>}
            {deployedOn.has(impl.agent.name) && <span className="text-xs text-muted-foreground">deployed</span>}
            {impl.id === chosen && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
        {statefulSteps.map((step) => (
          <div key={step.key} className="text-xs text-muted-foreground">
            {props.stepLabel(step)} runs on one agent, chosen when the flow is started.
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button onClick={() => void submit()} disabled={Boolean(props.refused) || !deployment || !chosen || submitting}>
          {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {props.runAfter ? "Deploy and run" : "Deploy"}
        </Button>
      </DialogFooter>
    </div>
  );
};
