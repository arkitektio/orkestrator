import { OmeroArkDataset } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListDatasetFragment } from "../../api/graphql";

interface Props {
  dataset: ListDatasetFragment;
  mates?: MateFinder[];
}

const Card = ({ dataset, mates }: Props) => {

  return (
    <OmeroArkDataset.Smart
      object={dataset?.id}
      dropClassName={({ isOver, canDrop,  isDragging }) =>
        `relative rounded group text-white bg-center bg-back-999 shadow-lg h-20  hover:bg-back-800 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "ring-primary-200 ring"} `
      }
      mates={mates}
    >
      <div className="px-2 py-2 h-full w-full top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate">
        <OmeroArkDataset.DetailLink
          className={({ isActive } /*  */) =>
            "z-10 font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={dataset.id}
        >
          {dataset?.name}
        </OmeroArkDataset.DetailLink>
      </div>
    </OmeroArkDataset.Smart>
  );
};

export default Card;
