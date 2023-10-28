import React from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroModel } from "../linker";
import { useDeleteModelMate } from "../mates/model/useDeleteModelMate";
import { useDownloadModelMate } from "../mates/model/useDownloadModelMate";
import { withMikro } from "../mikro/MikroContext";
import { useMyModelsQuery } from "../mikro/api/graphql";
import { ModelCard } from "../mikro/components/cards/ModelCard";
import { DataHomeFilterParams } from "../pages/data/Home";

export type IMyExperimentsProps = {};

const limit = 20;

const MyModels: React.FC<IMyExperimentsProps & DataHomeFilterParams> = ({
  createdDay,
}) => {
  const { data, error, loading, subscribeToMore, refetch } = withMikro(
    useMyModelsQuery
  )({
    variables: { limit: 20, offset: 0, createdDay: createdDay },
  });

  const deleteModelMate = useDeleteModelMate();
  const downloadModelMate = useDownloadModelMate();

  if (error) return <div>{error.message}</div>;

  return (
    <ListRender
      array={data?.mymodels}
      loading={loading}
      title={
        <MikroModel.ListLink className="flex-0">Models</MikroModel.ListLink>
      }
      refetch={refetch}
    >
      {(m, index) => (
        <ModelCard key={index} model={m} mates={[deleteModelMate(m), downloadModelMate(m.data)]} />
      )}
    </ListRender>
  );
};

export { MyModels };
