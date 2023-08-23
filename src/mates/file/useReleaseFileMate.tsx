import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withMikro } from "../../mikro/MikroContext";
import { useReleaseFilesMutation } from "../../mikro/api/graphql";
import { MateFinder } from "../types";

export const useReleaseFileMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [releaseFiles] = withMikro(useReleaseFilesMutation)();

  return async (options) => {
    if (
      options.partnersIncludeSelf ||
      options.partners == "list:@mikro/omerofile"
    ) {
      return [
        {
          action: async (event) => {
            await confirm({
              message:
                "Are you sure you want to release these file from this dataset",
            });

            releaseFiles({
              variables: {
                files: event.partners.map((p) => p.id),
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
