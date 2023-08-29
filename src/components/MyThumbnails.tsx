import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroThumbnail } from "../linker";
import { withMikro } from "../mikro/MikroContext";
import { useThumbnailsQuery } from "../mikro/api/graphql";
import { ThumbnailCard } from "../mikro/components/cards/ThumbnailCard";
import { DataHomeFilterParams } from "../pages/data/Home";
import { useDialog } from "../providers/dialog/DialogProvider";

export type IMyExperimentsProps = {};

const limit = 20;

const MyThumbnails: React.FC<IMyExperimentsProps & DataHomeFilterParams> = ({
  createdDay,
}) => {
  const variables = { limit: 20, offset: 0, createdDay: createdDay };

  const { data, error, subscribeToMore, refetch } = withMikro(
    useThumbnailsQuery
  )({
    variables,
    //pollInterval: 1000,
  });

  const { ask } = useDialog();
  const [show, setShow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  if (error) return <div>{error.message}</div>;

  return (
    <ListRender
      array={data?.thumbnails}
      title={
        <MikroThumbnail.ListLink className="flex-0">
          Thumbails
        </MikroThumbnail.ListLink>
      }
      refetch={refetch}
    >
      {(ex, index) => <ThumbnailCard key={index} thumbnail={ex} mates={[]} />}
    </ListRender>
  );
};

export { MyThumbnails };
