import { useMemo } from "react";
import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { RekuestAgent } from "@/core/linkers";
import type { Object } from "@/core/types";
import { buildAssignInput } from "../assign";
import {
  DemandKind,
  PortKind,
  RunOnImplementationFragment,
  useAgentsQuery,
  useRunOnImplementationsQuery,
} from "../api/graphql";
import { useAssign } from "../hooks/useAssign";
import { notifyAssignError } from "../lib/assignError";

/**
 * The agents a kabinet backend or pod runs as (rekuest records them by the
 * deployment's OAuth `clientId`, which the kabinet page hands over).
 */
type SectionProps = { identifier: string; object: Object };

const clientIdOf = (object: Object) => (typeof object.clientId === "string" ? object.clientId : undefined);

/** On a `@kabinet/backend` page: its agents, linked, with their liveness. */
export const BackendAgents = ({ object }: SectionProps) => {
  const clientId = clientIdOf(object);
  const { data, error } = useAgentsQuery({
    variables: { filters: { clientId } },
    skip: !clientId,
  });

  if (error) return <div>Error loading agent {error.message}</div>;

  return (
    <>
      {data?.agents.map((agent) => (
        <RekuestAgent.DetailLink
          object={agent}
          key={agent.id}
          className="text-sm font-medium hover:underline"
        >
          <Button variant="ghost" size="sm">
            {agent.connected ? <span className="text-success">● </span> : <span className="text-destructive">● </span>}
            {agent.name || "No Agent"}
          </Button>
        </RekuestAgent.DetailLink>
      ))}
    </>
  );
};

const PodActionButton = (props: { implementation: { id: string; action: { name: string } }; pod: string }) => {
  // The list already names the implementation: running it needs nothing else.
  const { assign } = useAssign();
  return (
    <Button
      onClick={() =>
        void assign(
          buildAssignInput({
            implementation: props.implementation.id,
            args: { pod: { __identifier: "@kabinet/pod", object: props.pod } },
          }),
        ).catch((error) =>
          notifyAssignError(error, { id: `assign:${props.implementation.id}` }),
        )
      }
      variant="outline"
      size="sm"
    >
      {props.implementation.action.name}
    </Button>
  );
};

/** The pod-taking actions of one agent (e.g. refresh its logs). */
const AgentPodActions = (props: {
  implementations: readonly { id: string; action: { name: string } }[];
  pod: string;
  backendName?: string;
}) => (
  <div className="flex flex-row gap-2">
    {props.implementations.map((implementation) => (
      <Tooltip key={implementation.id}>
        <TooltipTrigger asChild>
          <div>
            <PodActionButton implementation={implementation} pod={props.pod} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="p-2 text-sm">
            {implementation.action.name} on {props.backendName ?? "the backend"}
          </div>
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
);

/**
 * On a `@kabinet/pod` page: what its backend's agents can do with the pod.
 * One query for every agent of the backend (`agent.clientId`), grouped here
 * into a row per agent, rather than a query per agent.
 */
export const PodActions = ({ object }: SectionProps) => {
  const clientId = clientIdOf(object);
  const backendName = typeof object.backendName === "string" ? object.backendName : undefined;
  const { data, error } = useRunOnImplementationsQuery({
    variables: {
      filters: {
        agent: { clientId },
        action: {
          demands: [
            {
              kind: DemandKind.Args,
              matches: [{ key: "pod", kind: PortKind.Structure, identifier: "@kabinet/pod" }],
            },
          ],
        },
      },
    },
    skip: !clientId,
  });

  const byAgent = useMemo(() => {
    const groups = new Map<string, RunOnImplementationFragment[]>();
    for (const implementation of data?.implementations ?? []) {
      const group = groups.get(implementation.agent.id);
      if (group) group.push(implementation);
      else groups.set(implementation.agent.id, [implementation]);
    }
    return [...groups.entries()];
  }, [data]);

  if (error) return <ErrorNote error={error} title="Couldn't load the pod's actions" />;

  return (
    <>
      {byAgent.map(([agentId, implementations]) => (
        <AgentPodActions key={agentId} implementations={implementations} pod={object.id} backendName={backendName} />
      ))}
    </>
  );
};
