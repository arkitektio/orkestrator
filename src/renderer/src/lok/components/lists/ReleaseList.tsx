import { ListRender } from "@/core/layout/ListRender";
import { LokRelease } from "@/core/linkers";
import { useReleasesQuery } from "@/lok/api/graphql";
import ReleaseCard from "../cards/ReleaseCard";

const List = () => {
  const { data, loading, error, refetch } = useReleasesQuery();

  return (
    <ListRender
      array={data?.releases}
      loading={loading}
      error={error}
      title={<LokRelease.ListLink className="flex-0">Releases</LokRelease.ListLink>}
      // The query takes no variables, so paging has nothing to send.
      refetch={() => refetch()}
    >
      {(item) => <ReleaseCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
