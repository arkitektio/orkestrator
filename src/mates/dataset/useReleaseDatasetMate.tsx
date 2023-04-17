import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  MyOmeroFilesDocument,
  MyOmeroFilesQuery,
  MyOmeroFilesQueryVariables,
  useDeleteOmeroFileMutation,
  useReleaseDatasetsMutation,
  useReleaseFilesMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { Mate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useReleaseDatasetMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [release] = withMikro(useReleaseDatasetsMutation)();

  return (type, isSelf) => {
    if (isSelf || type == "list:@mikro/dataset") {
      return [
        {
          action: async (self, partner) => {
            await confirm({
              message:
                "Are you sure you want to release this datasets from this dataset",
            });

            release({
              variables: {
                datasets: partner.map((p) => p.object),
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
