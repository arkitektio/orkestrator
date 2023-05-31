import { useConfirm } from "../../components/confirmer/confirmer-context";
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
  return (agent: { id: string; __typename?: "Agent" }) => (type, isSelf) => {
    if (isSelf) {
      return [
        {
          action: async (self, drops) => {
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
