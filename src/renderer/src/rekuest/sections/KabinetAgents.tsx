import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { RekuestAgent } from "@/core/linkers";
import type { Object } from "@/core/types";
import { buildAssignInput } from "../assign";
import {
  DemandKind,
  type ListImplementationFragment,
  PortKind,
  useAgentsQuery,
  useImplementationsQuery,
} from "../api/graphql";
import { useImplementationAction } from "../hooks/useImplementationAction";

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
            {agent.connected ? <span className="text-green-400">● </span> : <span className="text-red-400">● </span>}
            {agent.name || "No Agent"}
          </Button>
        </RekuestAgent.DetailLink>
      ))}
    </>
  );
};

const PodActionButton = (props: { implementation: ListImplementationFragment; pod: string }) => {
  const { assign } = useImplementationAction({ id: props.implementation.id });
  return (
    <Button
      onClick={() => void assign(buildAssignInput({ args: { pod: { __identifier: "@kabinet/pod", object: props.pod } } }))}
      variant="outline"
      size="sm"
    >
      {props.implementation.action.name}
    </Button>
  );
};

/** One agent's actions that take a pod (e.g. refresh its logs). */
const AgentPodActions = (props: { agentId: string; pod: string; backendName?: string }) => {
  const { data } = useImplementationsQuery({
    variables: {
      filters: {
        agent: { ids: [props.agentId] },
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
  });

  return (
    <div className="flex flex-row gap-2">
      {data?.implementations.map((implementation) => (
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
};

/** On a `@kabinet/pod` page: what its backend's agents can do with the pod. */
export const PodActions = ({ object }: SectionProps) => {
  const clientId = clientIdOf(object);
  const backendName = typeof object.backendName === "string" ? object.backendName : undefined;
  const { data, error } = useAgentsQuery({
    variables: { filters: { clientId } },
    skip: !clientId,
  });

  if (error) return <div>Error loading agent {error.message}</div>;

  return (
    <>
      {data?.agents.map((agent) => (
        <AgentPodActions key={agent.id} agentId={agent.id} pod={object.id} backendName={backendName} />
      ))}
    </>
  );
};
