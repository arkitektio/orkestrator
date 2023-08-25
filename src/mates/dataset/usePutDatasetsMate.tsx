import { withMikro } from "../../mikro/MikroContext";
import { usePutDatasetsMutation } from "../../mikro/api/graphql";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { MateFinder } from "../types";

export const usePutDatasetsMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [put] = withMikro(usePutDatasetsMutation)();

  return async (options) => {
    if (options.partnersIncludeSelf) {
      return [
        {
          action: async (event) => {
            await confirm({
              message:
                "Are you sure you want to puth these datasets in this dataset",
            });

            put({
              variables: {
                datasets: event.partners.map((p) => p.id),
                dataset: datasetID,
              },
            });
          },
          label: <>Put</>,
          description: "Release this file from this dataset",
        },
      ];
    }
  };
};
