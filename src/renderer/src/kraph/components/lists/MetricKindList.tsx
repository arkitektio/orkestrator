import { ListRender } from "@/components/layout/ListRender";
import { KraphMetricKind } from "@/linkers";
import {
  MetricKindFilter,
  OffsetPaginationInput,
  useListMetricKindsQuery,
} from "../../api/graphql";
import MetricKindCard from "../cards/MetricKindCard";

export type Props = {
  filters?: MetricKindFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListMetricKindsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.metricKinds}
      title={
        <KraphMetricKind.ListLink className="flex-0">
          Metric Categories
        </KraphMetricKind.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <MetricKindCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
