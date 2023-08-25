import React, { useEffect, useState } from "react";
import { ListRender } from "../../layout/SectionTitle";
import { MikroStage } from "../../linker";
import { useDeleteStageMate } from "../../mates/stage/useDeleteStageMate";
import { withMikro } from "../MikroContext";
import { useMyStagesQuery } from "../api/graphql";
import { DataHomeFilterParams } from "../pages/Home";
import { StageCard } from "./cards/StageCard";

export type MyAcquisitionsProps = {};

const MyStages: React.FC<MyAcquisitionsProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const { data, error, loading, subscribeToMore, refetch } = withMikro(
    useMyStagesQuery
  )({
    variables: { limit: limit, offset: 0, createdDay: createdDay },
  });

  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  const deleteStageMate = useDeleteStageMate();

  useEffect(() => {
    refetch({ limit: limit, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <ListRender
      array={data?.mystages}
      loading={loading}
      title={
        <MikroStage.ListLink className="flex-0">Stages</MikroStage.ListLink>
      }
      refetch={refetch}
    >
      {(s, index) => (
        <StageCard key={index} stage={s} mates={[deleteStageMate(s)]} />
      )}
    </ListRender>
  );
};

export { MyStages };
