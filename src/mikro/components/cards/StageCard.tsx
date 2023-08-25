import { MikroStage } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListStageFragment } from "../../api/graphql";

interface StageCardProps {
  stage: ListStageFragment;
  mates: MateFinder[];
}

export const StageCard = ({ stage, mates }: StageCardProps) => {
  return (
    <MikroStage.Smart
      object={stage.id}
      className="bg-back-800 p-4 text-white rounded shadow-lg"
      mates={mates}
    >
      <MikroStage.DetailLink object={stage.id}>
        {stage.name}
      </MikroStage.DetailLink>
    </MikroStage.Smart>
  );
};
