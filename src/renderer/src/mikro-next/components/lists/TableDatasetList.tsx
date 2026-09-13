import { ListRender } from "@/components/layout/ListRender";
import { MikroTableDataset } from "@/linkers";
import {
  OffsetPaginationInput,
  TableDatasetFilter,
  useGetTableDatasetsQuery,
} from "../../api/graphql";
import TableDatasetCard from "../cards/TableDatasetCard";

export type Props = {
  filters?: TableDatasetFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useGetTableDatasetsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.tableDatasets}
      title={
        <MikroTableDataset.ListLink className="flex-0">
          Table Datasets
        </MikroTableDataset.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <TableDatasetCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
