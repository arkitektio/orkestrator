import { useDatalayer } from "@jhnnsrs/datalayer";
import { MateFinder } from "../../../mates/types";
import { LabelView } from "../../../next_linker";
import { LabelViewFragment } from "../../api/graphql";

interface Props {
  view: LabelViewFragment;
  mates?: MateFinder[];
}

const Card = ({ view, mates }: Props) => {
  const { s3resolve } = useDatalayer();

  return (
    <LabelView.Smart
      object={view?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `relative rounded group text-white bg-center bg-back-999 shadow-lg h-20  hover:bg-back-800 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "ring-primary-200 ring"} ${
          isSelected && "ring-2 ring-secondary-500"
        }`
      }
      mates={mates}
    >
      <div className="px-2 py-2 h-full w-full absolute top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate">
        {view.fluorophore?.name}
      </div>
    </LabelView.Smart>
  );
};

export default Card;
