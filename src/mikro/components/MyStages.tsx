import React, { useEffect, useState } from "react";
import { ListRender } from "../../layout/SectionTitle";
import { Stage } from "../../linker";
import { DataHomeFilterParams } from "../../pages/data/Home";
import { withMikro } from "../MikroContext";
import { useMyStagesQuery } from "../api/graphql";
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

  useEffect(() => {
    refetch({ limit: limit, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <ListRender
      array={data?.mystages}
      loading={loading}
      title={<Stage.ListLink className="flex-0">Stages</Stage.ListLink>}
      refetch={refetch}
    >
      {(s, index) => <StageCard key={index} stage={s} mates={[]} />}
    </ListRender>
  );
};

export { MyStages };
