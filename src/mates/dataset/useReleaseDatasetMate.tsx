import { withMikro } from "../../mikro/MikroContext";
import { useReleaseDatasetsMutation } from "../../mikro/api/graphql";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { MateFinder } from "../types";

export const useReleaseDatasetMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [release] = withMikro(useReleaseDatasetsMutation)();

  return async (options) => {
    if (options.partners == "list:@mikro/dataset") {
      return [
        {
          action: async (event) => {
            await confirm({
              message:
                "Are you sure you want to release this datasets from this dataset",
            });

            release({
              variables: {
                datasets: event.partners.map((p) => p.id),
                dataset: datasetID,
              },
            });
          },
          label: <>Release</>,
          description: "Release this file from this dataset",
        },
      ];
    }
  };
};
