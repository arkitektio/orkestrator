import { useDatalayer } from "@jhnnsrs/datalayer";
import ReactPlayer from "react-player";
import { VideoFragment } from "../../api/graphql";

const VideoPanel = ({ video }: { video: VideoFragment }) => {
  const { s3resolve } = useDatalayer();

  return (
    <>
      {video?.store && (
        <ReactPlayer
          url={s3resolve(video.store.presignedUrl)}
          onError={(e) => {
            console.log(e);
          }}
          controls
        />
      )}
    </>
  );
};

export default VideoPanel;
