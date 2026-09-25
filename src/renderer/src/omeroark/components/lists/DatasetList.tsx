import { ListRender } from "@/core/components/layout/ListRender";
import { OmeroArkDataset } from "@/core/linkers";
import { useListDatasetsQuery } from "@/omeroark/api/graphql";
import DatasetCard from "../cards/DatasetCard";

const List = () => {
  const { data, error, refetch } = useListDatasetsQuery({
    variables: {},
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
        refetch={() => refetch()}
      >
        {(ex) => <DatasetCard key={ex.id} item={ex} />}
      </ListRender>
    </>
  );
};

export default List;
