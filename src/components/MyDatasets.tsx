import { Maybe } from "graphql/jsutils/Maybe";
import React from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroDataset } from "../linker";
import { useDeleteDatesetMate } from "../mates/dataset/useDeleteDatasetMate";
import { useExportDatasetMate } from "../mates/dataset/useExportDatasetMate";
import { usePutFilesInDatasetsMate } from "../mates/dataset/usePutFilesMate";
import { withMikro } from "../mikro/MikroContext";
import { useMyDatasetsQuery } from "../mikro/api/graphql";
import { DatasetCard } from "../mikro/components/cards/DatasetCard";
import { DataHomeFilterParams } from "../mikro/pages/Home";

export type IMyExperimentsProps = {
  subscribe?: Maybe<boolean>;
} & DataHomeFilterParams;

const MyDatasets: React.FC<IMyExperimentsProps> = ({
  limit,
  createdDay,
  subscribe,
}) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };

  const { data, error, loading, subscribeToMore, refetch } = withMikro(
    useMyDatasetsQuery
  )({
    variables: variables,
  });

  const deleteDatasetMate = useDeleteDatesetMate();
  const putFiles = usePutFilesInDatasetsMate();

  if (error) return <div>{error.message} Not Loading </div>;

  return (
    <>
      <ListRender
        array={data?.mydatasets}
        loading={loading}
        title={
          <MikroDataset.ListLink className="flex-0">
            Datasets
          </MikroDataset.ListLink>
        }
        refetch={refetch}
      >
        {(dat, index) => (
          <DatasetCard
            key={index}
            dataset={dat}
            mates={[deleteDatasetMate(dat), putFiles]}
          />
        )}
      </ListRender>
    </>
  );
};

export { MyDatasets };
