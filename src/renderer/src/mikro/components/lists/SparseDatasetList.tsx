import { ListRender } from "@/core/layout/ListRender";
import { MikroSparseDataset } from "@/core/linkers";
import {
  OffsetPaginationInput,
  SparseDatasetFilter,
  SparseDatasetOrder,
  useGetSparseDatasetsQuery,
} from "../../api/graphql";
import SparseDatasetCard from "../cards/SparseDatasetCard";

export type Props = {
  filters?: SparseDatasetFilter;
  ordering?: SparseDatasetOrder[];
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, ordering, pagination }: Props) => {
  const { data, refetch } = useGetSparseDatasetsQuery({
    variables: { filters, ordering, pagination },
  });

  return (
    <ListRender
      array={data?.sparseDatasets}
      title={
        <MikroSparseDataset.ListLink className="flex-0">
          Sparse Datasets
        </MikroSparseDataset.ListLink>
      }
      refetch={refetch}
    >
      {(item) => <SparseDatasetCard key={item.id} item={item} />}
    </ListRender>
  );
};

export default List;
