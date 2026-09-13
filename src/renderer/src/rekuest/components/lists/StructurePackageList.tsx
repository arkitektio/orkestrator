import { ListRender } from "@/components/layout/ListRender";
import { RekuestAction } from "@/linkers";
import { useListStructurePackageQuery } from "@/rekuest/api/graphql";
import StructurePackageCard from "../cards/StructurePackageCard";

export type Props = {
  search?: string;
};

const List = ({ search }: Props) => {
  const { data, refetch } = useListStructurePackageQuery({
    variables: { search },
  });

  return (
    <ListRender
      array={data?.structurePackages}
      title={
        <RekuestAction.ListLink className="flex-0">
          Toolboxes
        </RekuestAction.ListLink>
      }
      refetch={() => refetch()}
    >
      {(ex) => <StructurePackageCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
