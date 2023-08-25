import { MikroTimepoint } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListTimepointFragment } from "../../api/graphql";

interface PositionCardProps {
  timepoint: ListTimepointFragment;
  mates: MateFinder[];
}

export const TimepointCard = ({ timepoint, mates }: PositionCardProps) => {
  return (
    <MikroTimepoint.Smart
      showSelfMates={true}
      placement="bottom"
      object={timepoint.id}
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
        <MikroTimepoint.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={timepoint.id}
        >
          <span className="truncate">{timepoint?.name}</span> {" - "}
          <span className="truncate">{timepoint?.deltaT}</span>
        </MikroTimepoint.DetailLink>
      </div>
    </MikroTimepoint.Smart>
  );
};
