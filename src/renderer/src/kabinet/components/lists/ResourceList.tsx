import { ListRender } from "@/core/layout/ListRender";
import { KabinetResource } from "@/core/linkers";
import { useListResourcesQuery } from "@/kabinet/api/graphql";
import ResourceCard from "../cards/ResourceCard";

const List = () => {
  const { data, loading, error, refetch } = useListResourcesQuery();

  return (
    <ListRender
      array={data?.resources}
      loading={loading}
      error={error}
      title={<KabinetResource.ListLink className="flex-0">Resources</KabinetResource.ListLink>}
      // The query takes no variables, so paging has nothing to send.
      refetch={() => refetch()}
    >
      {(item) => <ResourceCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
