import { ListRender } from "@/core/layout/ListRender";
import { KabinetBackend } from "@/core/linkers";
import { useListBackendsQuery } from "@/kabinet/api/graphql";
import BackendCard from "../cards/BackendCard";

const List = () => {
  const { data, loading, error, refetch } = useListBackendsQuery();

  return (
    <ListRender
      array={data?.backends}
      loading={loading}
      error={error}
      title={<KabinetBackend.ListLink className="flex-0">Backends</KabinetBackend.ListLink>}
      // The query takes no variables, so paging has nothing to send.
      refetch={() => refetch()}
    >
      {(item) => <BackendCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
