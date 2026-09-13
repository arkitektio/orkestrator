import { ListRender } from "@/components/layout/ListRender";
import { KraphNaturalEventCategory } from "@/linkers";
import {
  NaturalEventCategoryFilter,
  OffsetPaginationInput,
  useListNaturalEventCategoriesQuery
} from "../../api/graphql";
import NaturalEventCategoryCard from "../cards/NaturalEventCategoryCard";

export type Props = {
  filters?: NaturalEventCategoryFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListNaturalEventCategoriesQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.naturalEventCategories}
      title={
        <KraphNaturalEventCategory.ListLink className="flex-0">Natural Event Categories</KraphNaturalEventCategory.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <NaturalEventCategoryCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
