import { ListRender } from "@/components/layout/ListRender";

import {
  LayerFilter,
  OffsetPaginationInput,
  useLayersQuery
} from "@/lok-next/api/graphql";
import LayerCard from "../cards/LayerCard";

export type Props = {
  filters?: LayerFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useLayersQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.layers} // changed from clients to apps  here
      title={
        <div className="flex-0">Apps</div>
      }
      refetch={refetch}
    >
      {(ex) => <LayerCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
