import React from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroVideo } from "../linker";
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

  return (
    <ListRender
      array={data?.videos}
      title={
        <MikroVideo.ListLink className="flex-0">Videos</MikroVideo.ListLink>
      }
      refetch={refetch}
    >
      {(ex, index) => <VideoCard key={index} video={ex} mates={[]} />}
    </ListRender>
  );
};

export { MyVideos };
