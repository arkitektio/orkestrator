import { MikroRoi } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { RepRoiFragment } from "../../api/graphql";

interface PositionCardProps {
  roi: RepRoiFragment;
  mates: MateFinder[];
}

export const RoiCard = ({ roi, mates }: PositionCardProps) => {
  return (
    <MikroRoi.Smart
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
        <MikroRoi.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={roi.id}
        >
          <span className="truncate">{roi?.label}</span>
        </MikroRoi.DetailLink>
      </div>
    </MikroRoi.Smart>
  );
};
