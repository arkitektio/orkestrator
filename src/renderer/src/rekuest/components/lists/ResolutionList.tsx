import { ListRender } from "@/core/layout/ListRender";
import { RekuestResolution } from "@/core/linkers";
import { useListResolutionsQuery } from "@/rekuest/api/graphql";
import ResolutionCard from "../cards/ResolutionCard";

const List = () => {
  const { data, loading, error, refetch } = useListResolutionsQuery();

  return (
    <ListRender
      array={data?.resolutions}
      loading={loading}
      error={error}
      title={<RekuestResolution.ListLink className="flex-0">Resolutions</RekuestResolution.ListLink>}
      // The query takes no variables, so paging has nothing to send.
      refetch={() => refetch()}
    >
      {(item) => <ResolutionCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
