import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  MyOmeroFilesDocument,
  MyOmeroFilesQuery,
  MyOmeroFilesQueryVariables,
  useDeleteOmeroFileMutation,
  useReleaseFilesMutation,
  useReleaseSamplesMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { Mate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useReleaseSampleMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [releaseFiles] = withMikro(useReleaseSamplesMutation)();

  return (type, isSelf) => {
    if (isSelf || type == "list:@mikro/sample") {
      return [
        {
          action: async (self, partner) => {
            await confirm({
              message:
                "Are you sure you want to release this file from this dataset",
            });

            releaseFiles({
              variables: {
                samples: partner.map((p) => p.object),
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
