import { update } from "@react-spring/web";
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
import {
  usePullWhaleMutation,
  useRunWhaleMutation,
  useScanRepoMutation,
} from "../../port/api/graphql";
import { withPort } from "../../port/PortContext";
import { Mate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useGithubRepoLifecycleMate = (): MateFinder => {
  const { confirm } = useConfirm();

  const [scanRepo, _] = withPort(useScanRepoMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  return (type, isSelf) => {
    if (type == "item:@port/githubrepo") {
      return [
        {
          action: async (self, drops) => {
            await scanRepo({ variables: { id: self.object } });
          },
          label: "Scan",
          description: "Scan Repo",
        },
      ];
    }

    return [];
  };
};
