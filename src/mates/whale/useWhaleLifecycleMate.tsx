import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withPort } from "../../port/PortContext";
import {
  usePullWhaleMutation,
  usePurgeWhaleMutation,
  useRunWhaleMutation,
} from "../../port/api/graphql";
import { MateFinder } from "../types";

export const useWhaleLifecycleMate = (): MateFinder => {
  const { confirm } = useConfirm();

  const [deploy] = withPort(useRunWhaleMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  const [purge] = withPort(usePurgeWhaleMutation)({
    refetchQueries: ["ListWhales"],
  });

  return (type, isSelf) => {
    if (type == "item:@port/whale") {
      return [
        {
          action: async (self, drops) => {
            await confirm({
              message: "Do you really want to deploy this whale?",
              confirmLabel: "Yes deploy!",
            });

            await deploy({ variables: { id: self.object } });
          },
          label: "Deploy",
          description: "Deploy Whale",
        },
        {
          action: async (self, drops) => {
            await confirm({
              message: "Do you really want to update this whale?",
              confirmLabel: "Yes deploy!",
            });

            await pull({ variables: { id: self.object } });
          },
          label: "Pull",
          description: "Pull Update",
        },
        {
          action: async (self, drops) => {
            await confirm({
              message:
                "Do you really want to delete the downloaded image for this whale (you need to pull before deploying it!)?",
              confirmLabel: "Yes deploy!",
            });

            await purge({ variables: { id: self.object } });
          },
          label: "Purge",
          description: "Purge Image",
        },
      ];
    }

    return [];
  };
};
