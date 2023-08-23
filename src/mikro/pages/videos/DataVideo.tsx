import React from "react";
import { useParams } from "react-router";
import { Video } from "../../../mikro/components/Video";

export interface DataExperimentProps {}

export const DataVideo: React.FC<DataExperimentProps> = (props) => {
  const { video } = useParams<{ video: string }>();
  if (!video) return <></>;
  return <Video id={video} />;
};

export default DataVideo;
