import { withKluster } from "@jhnnsrs/kluster";
import { useStopDaskClusterMutation } from "../../kluster/api/graphql";
import { MateFinder } from "../types";

export const useStopDaskCluster = (item: {id: string}): MateFinder => {
  const [stop] = withKluster(useStopDaskClusterMutation)({
    refetchQueries: ["ListCluster"],
  })

  return async (options) => {
    if (options.justSelf) {
      return [
        {
          action: async (event) => {


            
            await stop({
              variables: {
                id: item.id,
              }
            })

          },
          label: "Stop Cluster",
          description: "Stops the cluster",
        },
      ];
    }

    return [];
  };
};