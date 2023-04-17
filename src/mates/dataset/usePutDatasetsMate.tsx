import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  MyOmeroFilesDocument,
  MyOmeroFilesQuery,
  MyOmeroFilesQueryVariables,
  useDeleteOmeroFileMutation,
  usePutDatasetsMutation,
  useReleaseDatasetsMutation,
  useReleaseFilesMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { Mate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const usePutDatasetsMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [put] = withMikro(usePutDatasetsMutation)();

  return (type, isSelf) => {
    if (isSelf || type == "list:@mikro/dataset") {
      return [
        {
          action: async (self, partner) => {
            await confirm({
              message:
                "Are you sure you want to puth these datasets in this dataset",
            });

            put({
              variables: {
                datasets: partner.map((p) => p.object),
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
