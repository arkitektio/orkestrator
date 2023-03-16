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
} from "../../port/api/graphql";
import { withPort } from "../../port/PortContext";
import { Mate } from "../../rekuest/postman/mater/mater-context";
import { MateFinder } from "../types";

export const useWhaleLifecycleMate = (): MateFinder => {
  const { confirm } = useConfirm();

  const [deploy] = withPort(useRunWhaleMutation)();

  const [pull] = withPort(usePullWhaleMutation)();
  return (type, isSelf) => {
    if (type == "item:@port/whale") {
      return [
        {
          action: async (self, drops) => {
            await confirm({
              message: "Do you really want to deploy this whale?",
              confirmLabel: "Yes deploy!",
            });

            await deploy({ variables: { id: self.object } });
          },
          label: "Deploy",
          description: "Deploy Whale",
        },
        {
          action: async (self, drops) => {
            await confirm({
              message: "Do you really want to update this whale?",
              confirmLabel: "Yes deploy!",
            });

            await pull({ variables: { id: self.object } });
          },
          label: "Pull",
          description: "Pull Update",
        },
      ];
    }

    return [];
  };
};
