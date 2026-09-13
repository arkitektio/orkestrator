import { ListRender } from "@/components/layout/ListRender";
import { ElektroTrace } from "@/linkers";

import { TraceFilter, useTracesQuery } from "@/elektro/api/graphql";
import { OffsetPaginationInput } from "@/lok-next/api/graphql";
import TraceCard from "../cards/TraceCard";

export type Props = {
  filters?: TraceFilter;
  pagination?: OffsetPaginationInput;
};

const List = (_props: Props) => {
  const { data, refetch } = useTracesQuery({});

  return (
    <ListRender
      array={data?.traces}
      title={
        <ElektroTrace.ListLink className="flex-0">Traces</ElektroTrace.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <TraceCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
