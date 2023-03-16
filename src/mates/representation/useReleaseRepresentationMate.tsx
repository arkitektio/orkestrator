import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  MyOmeroFilesDocument,
  MyOmeroFilesQuery,
  MyOmeroFilesQueryVariables,
  useDeleteOmeroFileMutation,
  useReleaseFilesMutation,
  useReleaseRepresentationsMutation,
  useReleaseSamplesMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { Mate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useReleaseRepresentationMate = (datasetID: string): MateFinder => {
  const { confirm } = useConfirm();
  const [releaseFiles] = withMikro(useReleaseRepresentationsMutation)();

  return (type, isSelf) => {
    if (isSelf || type == "list:@mikro/representation") {
      return [
        {
          action: async (self, partner) => {
            await confirm({
              message:
                "Are you sure you want to release this file from this dataset",
            });

            releaseFiles({
              variables: {
                representations: partner.map((p) => p.object),
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
