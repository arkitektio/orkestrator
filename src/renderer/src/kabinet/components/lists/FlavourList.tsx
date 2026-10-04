import { ListRender } from "@/core/layout/ListRender";
import { KabinetFlavour } from "@/core/linkers";
import { useListFlavoursQuery } from "@/kabinet/api/graphql";
import FlavourCard from "../cards/FlavourCard";

const List = () => {
  const { data, loading, error, refetch } = useListFlavoursQuery();

  return (
    <ListRender
      array={data?.flavours}
      loading={loading}
      error={error}
      title={<KabinetFlavour.ListLink className="flex-0">Flavours</KabinetFlavour.ListLink>}
      // The query takes no variables, so paging has nothing to send.
      refetch={() => refetch()}
    >
      {(item) => <FlavourCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
