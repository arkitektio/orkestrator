import { ListRender } from "@/components/layout/ListRender";
import { KraphReagentCategory } from "@/linkers";
import {
  OffsetPaginationInput,
  ProtocolEventCategoryFilter,
  useListProtocolEventCategoriesQuery
} from "../../api/graphql";
import ProtocolEventCategoryCard from "../cards/ProtocolEventCategoryCard";

export type Props = {
  filters?: ProtocolEventCategoryFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListProtocolEventCategoriesQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.protocolEventCategories}
      title={
        <KraphReagentCategory.ListLink className="flex-0">Protocol Categories</KraphReagentCategory.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <ProtocolEventCategoryCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
