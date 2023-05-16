import { Maybe } from "graphql/jsutils/Maybe";
import React, { useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Dataset } from "../linker";
import { useDeleteDatesetMate } from "../mates/dataset/useDeleteDatasetMate";
import { useExportDatasetMate } from "../mates/dataset/useExportDatasetMate";
import { withMikro } from "../mikro/MikroContext";
import { useMyDatasetsQuery } from "../mikro/api/graphql";
import { DatasetCard } from "../mikro/components/cards/DatasetCard";
import { DataHomeFilterParams } from "../pages/data/Home";

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

  const [show, setShow] = useState(false);

  const { ask } = useDialog();

  const deleteDatasetMate = useDeleteDatesetMate();
  const exportDatasetMate = useExportDatasetMate();

  if (error) return <div>{error.message}</div>;

  return (
    <>
      <ListRender
        array={data?.mydatasets}
        loading={loading}
        title={<Dataset.ListLink className="flex-0">Datasets</Dataset.ListLink>}
        refetch={refetch}
      >
        {(dat, index) => (
          <DatasetCard
            key={index}
            dataset={dat}
            mates={[deleteDatasetMate(dat), exportDatasetMate]}
          />
        )}
      </ListRender>
    </>
  );
};

export { MyDatasets };
