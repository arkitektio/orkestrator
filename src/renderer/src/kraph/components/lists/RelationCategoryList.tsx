import { ListRender } from "@/components/layout/ListRender";
import { KraphRelationCategory } from "@/linkers";
import {
  MetricKindFilter,
  OffsetPaginationInput,
  useListRelationCategoryQuery
} from "../../api/graphql";
import RelationCategoryCard from "../cards/RelationCategoryCard";

export type Props = {
  filters?: MetricKindFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } =
    useListRelationCategoryQuery({
      variables: { filters, pagination },
    });

  return (
    <ListRender
      array={data?.relationCategories}
      title={
        <KraphRelationCategory.ListLink className="flex-0">
          Relation Categories
        </KraphRelationCategory.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <RelationCategoryCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
