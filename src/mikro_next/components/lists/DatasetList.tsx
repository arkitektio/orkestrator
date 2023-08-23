import { PaginatedList } from "../../../layout/PaginatedList";
import { Image } from "../../../next_linker";
import { withMikroNext } from "../../MikroNextContext";
import {
  DatasetFilter,
  OffsetPaginationInput,
  useGetDatasetsQuery,
} from "../../api/graphql";
import DatasetCard from "../cards/DatasetCard";

export type Props = {
  filters?: DatasetFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, subscribeToMore, refetch } = withMikroNext(
    useGetDatasetsQuery
  )({
    variables: { filters, pagination },
  });

  return (
    <PaginatedList
      array={data?.datasets}
      title={<Image.ListLink className="flex-0">Datasets</Image.ListLink>}
      refetch={refetch}
    >
      {(ex, index) => <DatasetCard key={index} dataset={ex} mates={[]} />}
    </PaginatedList>
  );
};

export default List;
