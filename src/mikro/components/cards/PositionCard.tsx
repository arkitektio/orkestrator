import { MikroPosition } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListPositionFragment } from "../../api/graphql";

interface PositionCardProps {
  position: ListPositionFragment;
  mates: MateFinder[];
}

export const PositionCard = ({ position, mates }: PositionCardProps) => {
  return (
    <MikroPosition.Smart
      showSelfMates={true}
      placement="bottom"
      object={position.id}
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
        <MikroPosition.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={position.id}
        >
          <span className="truncate">{position?.name}</span>
        </MikroPosition.DetailLink>
      </div>
    </MikroPosition.Smart>
  );
};
