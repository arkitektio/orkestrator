import { ListRender } from "@/components/layout/ListRender";
import { KraphStructureRelationCategory } from "@/linkers";
import {
  MetricKindFilter,
  OffsetPaginationInput,
  useListStructureRelationCategoryQuery,
} from "../../api/graphql";
import StructureRelationCategoryCard from "../cards/StructureRelationCategoryCard";

export type Props = {
  filters?: MetricKindFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } =
    useListStructureRelationCategoryQuery({
      variables: { filters, pagination },
    });

  return (
    <ListRender
      array={data?.structureRelationCategories}
      title={
        <KraphStructureRelationCategory.ListLink className="flex-0">
          Structure Relation Categories
        </KraphStructureRelationCategory.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => (
        <StructureRelationCategoryCard key={ex.id} item={ex} />
      )}
    </ListRender>
  );
};

export default List;
