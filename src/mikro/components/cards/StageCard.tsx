import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Stage } from "../../../linker";
import {
  ListStageFragment,
  ListExperimentFragment,
  useDeleteStageMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

interface AcquisitionCardProps {
  stage: ListStageFragment;
}

export const StageCard = ({ stage }: AcquisitionCardProps) => {
  const [deleteAcquisition] = withMikro(useDeleteStageMutation)();
  const { confirm } = useConfirm();

  return (
    <Stage.Smart
      object={stage.id}
      className="bg-back-800 p-4 text-white rounded shadow-lg"
      additionalMates={(accept, self) => {
        if (!self) return [];

        return [
          {
            accepts: [accept],
            action: async (self, drops) => {
              await confirm({
                message: "Do you really want to delete?",
                subtitle: "Deletion is irreversible!",
                confirmLabel: "Yes delete!",
              });

              await deleteAcquisition({
                variables: { id: stage.id },
              });
            },
            label: <BsTrash />,
            description: "Delete",
          },
        ];
      }}
    >
      <Stage.DetailLink object={stage.id}>{stage.name}</Stage.DetailLink>
    </Stage.Smart>
  );
};
