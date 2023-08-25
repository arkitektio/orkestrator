import { useDatalayer } from "@jhnnsrs/datalayer";
import { OptimizedImage } from "../../../layout/OptimizedImage";
import { MikroRepresentation, MikroView } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListViewFragment } from "../../api/graphql";

interface RepresentationCardProps {
  view: ListViewFragment;
  mates: MateFinder[];
}

export const ViewCard = ({ view, mates }: RepresentationCardProps) => {
  const { s3resolve } = useDatalayer();

  return (
    <MikroView.Smart
      object={view?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `relative rounded group text-white bg-center bg-back-999 bg-opacity-20 shadow-lg h-20 border-1 border hover:bg-back-800 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "ring-primary-200 ring"} ${
          isSelected && "ring-2 ring-secondary-500"
        }`
      }
      mates={mates}
    >
      {view.omero.representation?.latestThumbnail?.image && (
        <OptimizedImage
          src={s3resolve(view.omero.representation?.latestThumbnail?.image)}
          style={{ filter: "brightness(0.7)" }}
          className="object-cover h-full w-full absolute top-0 left-0 rounded"
        />
      )}
      <div className="px-2 py-2 h-full w-full absolute top-0 left-0 hover:bg-opacity-20 bg-opacity-10 bg-back-999 transition-all ease-in-out duration-200">
        {view?.accessors?.join(",")} on{" "}
        {view.omero.representation && (
          <MikroRepresentation.DetailLink
            className={({ isActive } /*  */) =>
              "z-10 font-bold text-md mb-2 cursor-pointer " +
              (isActive ? "text-primary-300" : "")
            }
            object={view.omero.representation?.id}
          >
            {view.omero.representation?.name}
          </MikroRepresentation.DetailLink>
        )}
      </div>
    </MikroView.Smart>
  );
};
