import { withPort } from "../../port/PortContext";
import {
  DeploymentsDocument,
  useScanRepoMutation,
} from "../../port/api/graphql";
import { MateFinder } from "../types";

export const useGithubRepoLifecycleMate = (): MateFinder => {
  const [scanRepo, _] = withPort(useScanRepoMutation)({
    refetchQueries: [DeploymentsDocument],
  });

  return async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {
            await scanRepo({ variables: { id: event.self.id } });
          },
          label: "Scan",
          description: "Scan Repo",
        },
      ];
    }

    return [];
  };
};
