import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withMikro } from "../../mikro/MikroContext";
import { useReleaseRepresentationsMutation } from "../../mikro/api/graphql";
import { MateFinder } from "../types";

export const useReleaseRepresentationMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [releaseRepresentations] = withMikro(
    useReleaseRepresentationsMutation
  )();

  return async (options) => {
    if (
      options.partners == "list:@mikro/representation" ||
      options.partners == "item:@mikro/representation"
    ) {
      return [
        {
          action: async (event) => {
            await confirm({
              message:
                "Are you sure you want to release these images from this dataset",
            });

            releaseRepresentations({
              variables: {
                representations: event.partners.map((p) => p.id),
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
