import { ListRender } from "@/core/layout/ListRender";
import { RekuestAction } from "@/core/linkers";
import { useListStructurePackageQuery } from "@/rekuest/api/graphql";
import StructurePackageCard from "../cards/StructurePackageCard";
import { FIRST_PAGE } from "./firstPage";

export type Props = {
  search?: string;
};

const List = ({ search }: Props) => {
  const { data, refetch } = useListStructurePackageQuery({
    variables: { search, pagination: FIRST_PAGE },
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
