import { ListRender } from "@/core/components/layout/ListRender";
import { KraphMetricKind } from "@/core/linkers";
import {
  MetricKindFilter,
  OffsetPaginationInput,
  useListMeasurmentCategoryQuery,
} from "../../api/graphql";
import MeasurementCategoryCard from "../cards/MeasurementCategoryCard";

export type Props = {
  filters?: MetricKindFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } =
    useListMeasurmentCategoryQuery({
      variables: { filters, pagination },
    });

  return (
    <ListRender
      array={data?.measurementCategories}
      title={
        <KraphMetricKind.ListLink className="flex-0">
          Metric Categories
        </KraphMetricKind.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => (
        <MeasurementCategoryCard key={ex.id} item={ex} />
      )}
    </ListRender>
  );
};

export default List;
