import { useDatalayer } from "@jhnnsrs/datalayer";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Timepoint } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { withMikro } from "../../MikroContext";
import {
  ListTimepointFragment,
  useDeleteRepresentationMutation,
} from "../../api/graphql";

interface PositionCardProps {
  timepoint: ListTimepointFragment;
  mates: MateFinder[];
}

export const TimepointCard = ({ timepoint, mates }: PositionCardProps) => {
  const { s3resolve } = useDatalayer();
  const [deletePosition] = withMikro(useDeleteRepresentationMutation)();
  const { confirm } = useConfirm();

  return (
    <Timepoint.Smart
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
        <Timepoint.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={timepoint.id}
        >
          <span className="truncate">{timepoint?.name}</span> {" - "}
          <span className="truncate">{timepoint?.deltaT}</span>
        </Timepoint.DetailLink>
      </div>
    </Timepoint.Smart>
  );
};
