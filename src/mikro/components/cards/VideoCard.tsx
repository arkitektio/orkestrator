import { useDatalayer } from "@jhnnsrs/datalayer";
import { OptimizedImage } from "../../../layout/OptimizedImage";
import { Video } from "../../../linker";
import { useDownloadFileMate } from "../../../mates/file/useDownloadFileMate";
import { MateFinder } from "../../../mates/types";
import { ListVideoFragment } from "../../api/graphql";

interface GraphCardProps {
  video: ListVideoFragment;
  mates: MateFinder[];
}

export const VideoCard = ({ video, mates }: GraphCardProps) => {
  const { s3resolve } = useDatalayer();
  const mate = useDownloadFileMate();
  return (
    <Video.Smart
      object={video.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `relative rounded group text-white bg-center bg-back-999 shadow-lg h-20  hover:bg-back-800 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "ring-primary-200 ring"} ${
          isSelected && "ring-2 ring-secondary-500"
        }`
      }
      mates={mates}
    >
      {video.frontImage && (
        <OptimizedImage
          src={s3resolve(video?.frontImage)}
          style={{ filter: "brightness(0.7)" }}
          className="object-cover h-full w-full absolute top-0 left-0 rounded"
        />
      )}
      <div className="px-2 py-2 h-full w-full absolute top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate">
        <Video.DetailLink
          className={({ isActive } /*  */) =>
            "z-10 font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={video.id}
        >
          {video?.id}
        </Video.DetailLink>
      </div>
    </Video.Smart>
  );
};
