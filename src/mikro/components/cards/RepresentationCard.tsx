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
      dropClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded group text-white bg-center bg-black shadow-lg h-20  hover:scale-110 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-2 ring-secondary-500 "
        }`
      }
      mates={mates}
    >
      {rep.latestThumbnail && (
        <OptimizedImage
          src={s3resolve(rep?.latestThumbnail.image)}
          style={{ filter: "brightness(0.7)" }}
          className="object-cover h-[4rem] w-full absolute top-0 left-0 rounded"
          blurhash={rep?.latestThumbnail.blurhash}
        />
      )}
      <div className="px-6 py-4">
        <Representation.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
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
