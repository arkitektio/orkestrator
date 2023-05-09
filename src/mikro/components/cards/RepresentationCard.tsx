import { useDatalayer } from "@jhnnsrs/datalayer";
import { OptimizedImage } from "../../../layout/OptimizedImage";
import { Representation } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListRepresentationFragment } from "../../api/graphql";

interface RepresentationCardProps {
  rep: ListRepresentationFragment;
  mates: MateFinder[];
}

export const RepresentationCard = ({ rep, mates }: RepresentationCardProps) => {
  const { s3resolve } = useDatalayer();

  return (
    <Representation.Smart
      object={rep?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `relative rounded group text-white bg-center bg-back-999 bg-opacity-20 shadow-lg h-20 border-1 border hover:bg-back-800 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "ring-primary-200 ring"} ${
          isSelected && "ring-2 ring-secondary-500"
        }`
      }
      mates={mates}
    >
      {rep.latestThumbnail?.image && (
        <OptimizedImage
          src={s3resolve(rep?.latestThumbnail.image)}
          style={{ filter: "brightness(0.7)" }}
          className="object-cover h-full w-full absolute top-0 left-0 rounded"
          blurhash={rep?.latestThumbnail.blurhash}
        />
      )}
      <div className="px-2 py-2 h-full w-full absolute top-0 left-0 hover:bg-opacity-20 bg-opacity-10 bg-back-999 transition-all ease-in-out duration-200 truncate">
        <Representation.DetailLink
          className={({ isActive } /*  */) =>
            "z-10 font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={rep.id}
        >
          {rep?.name}
        </Representation.DetailLink>
      </div>
    </Representation.Smart>
  );
};
