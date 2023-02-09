import React from "react";
import { OptimizedImage } from "../../../layout/OptimizedImage";
import { Experiment, Representation } from "../../../linker";
import {
  ListRepresentationFragment,
  useDeleteRepresentationMutation,
} from "../../api/graphql";
import { useMikro, withMikro } from "../../MikroContext";

interface RepresentationCardProps {
  rep: ListRepresentationFragment;
}

export const RepresentationCard = ({ rep }: RepresentationCardProps) => {
  const { s3resolve } = useMikro();
  const [deleteRepresentation] = withMikro(useDeleteRepresentationMutation)();

  return (
    <Representation.Smart
      showSelfMates={true}
      placement="bottom"
      object={rep.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white  h-[4rem] bg-center bg-cover bg-black ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      {rep.latestThumbnail && (
        <OptimizedImage
          src={s3resolve(rep?.latestThumbnail.image)}
          style={{ filter: "brightness(0.7)" }}
          className="object-cover h-[4rem] w-full absolute top-0 left-0 rounded"
          blurhash={rep?.latestThumbnail.blurhash}
        />
      )}
      <div className="px-6 py-4 truncate relative">
        <Representation.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={rep.id}
        >
          <span className="truncate">{rep?.name}</span>
        </Representation.DetailLink>
        <p className="text-white-700 text-base group-hover:block hidden">
          {rep?.sample?.name}
        </p>
      </div>
    </Representation.Smart>
  );
};
