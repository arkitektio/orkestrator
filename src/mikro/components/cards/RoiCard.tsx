import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Roi } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { useMikro, withMikro } from "../../MikroContext";
import {
  RepRoiFragment,
  useDeleteRepresentationMutation,
} from "../../api/graphql";

interface PositionCardProps {
  roi: RepRoiFragment;
  mates: MateFinder[];
}

export const RoiCard = ({ roi, mates }: PositionCardProps) => {
  const { s3resolve } = useMikro();
  const [deletePosition] = withMikro(useDeleteRepresentationMutation)();
  const { confirm } = useConfirm();

  return (
    <Roi.Smart
      showSelfMates={true}
      placement="bottom"
      object={roi.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white  h-[4rem] bg-center bg-cover bg-black ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      mates={mates}
    >
      <div className="px-6 py-4 truncate relative">
        <Roi.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={roi.id}
        >
          <span className="truncate">{roi?.label}</span>
        </Roi.DetailLink>
      </div>
    </Roi.Smart>
  );
};
