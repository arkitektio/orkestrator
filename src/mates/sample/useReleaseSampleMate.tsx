import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withMikro } from "../../mikro/MikroContext";
import { useReleaseSamplesMutation } from "../../mikro/api/graphql";
import { MateFinder } from "../types";

export const useReleaseSampleMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [releaseFiles] = withMikro(useReleaseSamplesMutation)();

  return async (options) => {
    if (
      options.partners == "list:@mikro/sample" ||
      options.partners == "item:@mikro/sample"
    ) {
      return [
        {
          action: async (event) => {
            await confirm({
              message:
                "Are you sure you want to release these samples from this dataset",
            });

            releaseFiles({
              variables: {
                samples: event.partners.map((p) => p.id),
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
