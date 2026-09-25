import { ListRender } from "@/core/layout/ListRender";
import { RekuestStructure } from "@/core/linkers";
import { useListStructuresQuery } from "@/rekuest/api/graphql";
import StructureCard from "../cards/StructureCard";

export type Props = {
  search?: string;
};

const List = ({ search }: Props) => {
  const { data, refetch } = useListStructuresQuery({
    variables: { search },
  });

  return (
    <ListRender
      array={data?.structures}
      title={
        <RekuestStructure.ListLink className="flex-0">
          Structures
        </RekuestStructure.ListLink>
      }
      refetch={() => refetch()}
    >
      {(ex, _index) => <StructureCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
