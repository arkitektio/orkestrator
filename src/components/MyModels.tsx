import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Model } from "../linker";
import { useDeleteModelMate } from "../mates/model/useDeleteModelMate";
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

  const { ask } = useDialog();
  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  const deleteModelMate = useDeleteModelMate();

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <ListRender
      array={data?.mymodels}
      loading={loading}
      title={<Model.ListLink className="flex-0">Models</Model.ListLink>}
      refetch={refetch}
    >
      {(m, index) => (
        <ModelCard key={index} model={m} mates={[deleteModelMate(m)]} />
      )}
    </ListRender>
  );
};

export { MyModels };
