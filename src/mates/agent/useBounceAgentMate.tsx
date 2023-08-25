import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import { useBounceAgentMutation } from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export type AgentKickeMater = (agent: {
  id: string;
  __typename?: "Agent";
}) => MateFinder;

export const useBounceAgentMate = (): AgentKickeMater => {
  const { confirm } = useConfirm();

  const [bounce] = withRekuest(useBounceAgentMutation)();
  return (agent: { id: string; __typename?: "Agent" }) => async (options) => {
    if (options.partnersIncludeSelf) {
      return [
        {
          action: async (event) => {
            await confirm({
              message: "Bounce agent",
              subtitle:
                "Are you sure you want to bounce this agent? It will briefly disconnect but then should reconnect",
              confirmLabel: "Bounce",
            });

            await bounce({
              variables: {
                id: agent.id,
              },
            });
          },
          label: "BOunce",
          description:
            "Bounce this agent from its connection, but let reconnect",
        },
      ];
    }

    return [];
  };
};
