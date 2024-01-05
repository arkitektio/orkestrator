import Timestamp from "react-timestamp";
import { KlusterDaskCluster } from "../../../linker";
import { useOpenDashboard } from "../../../mates/dask_cluster/useOpenDashboard";
import { useStopDaskCluster } from "../../../mates/dask_cluster/useStopDaskCluster";
import { MateFinder } from "../../../mates/types";
import { ListDaskClusterFragment } from "../../api/graphql";

interface Props {
  daskCluster: ListDaskClusterFragment;
  mates?: MateFinder[];
}

const Card = ({ daskCluster, mates }: Props) => {

  const mate = useOpenDashboard(daskCluster);
  const stopMate = useStopDaskCluster(daskCluster);

  return (
    <KlusterDaskCluster.Smart
      object={daskCluster?.id}
      dropClassName={({ isOver, canDrop,  isDragging }) =>
        `relative rounded group text-white bg-center bg-back-999 shadow-lg h-20  hover:bg-back-800 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "ring-primary-200 ring"} `
      }
      mates={[mate, stopMate, ...mates || []]}
    >
      <div className="px-2 py-2 h-full w-full top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate">
        <KlusterDaskCluster.DetailLink
          className={({ isActive } /*  */) =>
            "z-10 font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={daskCluster.id}
        >
          <Timestamp date={daskCluster?.startTime} relative />
        </KlusterDaskCluster.DetailLink>
      </div>
    </KlusterDaskCluster.Smart>
  );
};

export default Card;
