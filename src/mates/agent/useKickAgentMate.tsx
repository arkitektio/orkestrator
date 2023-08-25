import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import { useKickAgentMutation } from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export type AgentKickeMater = (agent: {
  id: string;
  __typename?: "Agent";
}) => MateFinder;

export const useKickAgentMate = (): AgentKickeMater => {
  const { confirm } = useConfirm();

  const [kick] = withRekuest(useKickAgentMutation)();
  return (agent: { id: string; __typename?: "Agent" }) => async (options) => {
    if (options.partnersIncludeSelf) {
      return [
        {
          action: async (event) => {
            await confirm({
              message: "Kick agent",
              subtitle: "Are you sure you want to kick this agent?",
              confirmLabel: "Kick",
            });

            await kick({
              variables: {
                id: agent.id,
              },
            });
          },
          label: "Kick",
          description: "Kick this agent from its connection.",
        },
      ];
    }

    return [];
  };
};
