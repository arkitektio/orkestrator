import { ListRender } from "@/core/layout/ListRender";
import { RekuestInterface } from "@/core/linkers";
import { useListInterfacesQuery } from "@/rekuest/api/graphql";
import InterfaceCard from "../cards/InterfaceCard";
import { FIRST_PAGE } from "./firstPage";

export type Props = {
  search?: string;
};

const List = ({ search }: Props) => {
  const { data, refetch } = useListInterfacesQuery({
    variables: { search, pagination: FIRST_PAGE },
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
