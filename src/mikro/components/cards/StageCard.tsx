import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Stage } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import {
  ListStageFragment,
  ListExperimentFragment,
  useDeleteStageMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

interface StageCardProps {
  stage: ListStageFragment;
  mates: MateFinder[];
}

export const StageCard = ({ stage, mates }: StageCardProps) => {
  return (
    <Stage.Smart
      object={stage.id}
      className="bg-back-800 p-4 text-white rounded shadow-lg"
      mates={mates}
    >
      <Stage.DetailLink object={stage.id}>{stage.name}</Stage.DetailLink>
    </Stage.Smart>
  );
};
