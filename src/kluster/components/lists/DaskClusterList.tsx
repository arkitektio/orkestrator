import { withKluster } from "@jhnnsrs/kluster";
import { ListRender } from "../../../layout/SectionTitle";
import { KlusterDaskCluster } from "../../../linker";
import { useListClusterQuery } from "../../api/graphql";
import DaskClusterCard from "../cards/DaskClusterCard";



const List = () => {
  const { data, error, subscribeToMore, refetch } = withKluster(
    useListClusterQuery,
  )({
    variables: {  },
  });

  return (
    <>
    {error && <div>Error: {error.message}</div>}
    <ListRender
      array={data?.daskClusters}
      title={
        <KlusterDaskCluster.ListLink className="flex-0">
          My Dask Clusters
        </KlusterDaskCluster.ListLink>
      }
      refetch={refetch}
    >
      {(ex, index) => <DaskClusterCard key={index} daskCluster={ex} mates={[]} />}
    </ListRender>
    </>
  );
};

export default List;
