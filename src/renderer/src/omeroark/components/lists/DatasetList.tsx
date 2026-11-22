import { ListRender } from "@/core/layout/ListRender";
import { OmeroArkDataset } from "@/core/linkers";
import {
  DatasetFilter,
  OffsetPaginationInput,
  useListDatasetsQuery,
} from "@/omeroark/api/graphql";
import DatasetCard from "../cards/DatasetCard";

export type Props = {
  filters?: DatasetFilter;
  pagination?: OffsetPaginationInput;
};

// One page, the size ListRender pages by: an OMERO server can hold far more
// datasets than one grid should ask for at once.
const DEFAULT_PAGINATION: OffsetPaginationInput = { limit: 20, offset: 0 };

const List = ({ filters, pagination = DEFAULT_PAGINATION }: Props) => {
  const { data, error, refetch } = useListDatasetsQuery({
    variables: { filters, pagination },
  });

  return (
    <>
      {error && <div>Error: {error.message}</div>}
      <ListRender
        array={data?.datasets}
        title={
          <OmeroArkDataset.ListLink className="flex-0">
            Latest Datasets
          </OmeroArkDataset.ListLink>
        }
        limit={pagination.limit ?? undefined}
        refetch={refetch}
      >
        {(ex) => <DatasetCard key={ex.id} item={ex} />}
      </ListRender>
    </>
  );
};

export default List;
