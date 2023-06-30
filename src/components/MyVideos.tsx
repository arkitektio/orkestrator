import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Graph } from "../linker";
import { withMikro } from "../mikro/MikroContext";
import { useVideosQuery } from "../mikro/api/graphql";
import { VideoCard } from "../mikro/components/cards/VideoCard";
import { DataHomeFilterParams } from "../pages/data/Home";

export type IMyExperimentsProps = {};

const limit = 20;

const MyVideos: React.FC<IMyExperimentsProps & DataHomeFilterParams> = ({
  createdDay,
}) => {
  const variables = { limit: 20, offset: 0, createdDay: createdDay };

  const { data, error, subscribeToMore, refetch } = withMikro(useVideosQuery)({
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
      array={data?.videos}
      title={<Graph.ListLink className="flex-0">Videos</Graph.ListLink>}
      refetch={refetch}
    >
      {(ex, index) => <VideoCard key={index} video={ex} mates={[]} />}
    </ListRender>
  );
};

export { MyVideos };
