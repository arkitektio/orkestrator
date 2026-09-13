import { ListRender } from "@/components/layout/ListRender";
import { RekuestInterface } from "@/linkers";
import { useListInterfacesQuery } from "@/rekuest/api/graphql";
import InterfaceCard from "../cards/InterfaceCard";

export type Props = {
  search?: string;
};

const List = ({ search }: Props) => {
  const { data, refetch } = useListInterfacesQuery({
    variables: { search },
  });

  return (
    <ListRender
      array={data?.interfaces}
      title={
        <RekuestInterface.ListLink className="flex-0">
          Interfaces
        </RekuestInterface.ListLink>
      }
      refetch={() => refetch()}
    >
      {(ex) => <InterfaceCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
