import { ListRender } from "@/components/layout/ListRender";
import { KraphStructureKind } from "@/linkers";
import {
  OffsetPaginationInput,
  StructureKindFilter,
  useListStructureKindsQuery
} from "../../api/graphql";
import StructureKindCard from "../cards/StructureKindCard";

export type Props = {
  filters?: StructureKindFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListStructureKindsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.structureKinds}
      title={
        <KraphStructureKind.ListLink className="flex-0">Structure Categories</KraphStructureKind.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <StructureKindCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
