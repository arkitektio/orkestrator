import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  MyOmeroFilesDocument,
  MyOmeroFilesQuery,
  MyOmeroFilesQueryVariables,
  useDeleteOmeroFileMutation,
  useReleaseFilesMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { Mate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useReleaseFileMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [releaseFiles] = withMikro(useReleaseFilesMutation)();

  return (type, isSelf) => {
    if (isSelf || type == "list:@mikro/omerofile") {
      return [
        {
          action: async (self, partner) => {
            await confirm({
              message:
                "Are you sure you want to release this file from this dataset",
            });

            releaseFiles({
              variables: {
                files: partner.map((p) => p.object),
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
