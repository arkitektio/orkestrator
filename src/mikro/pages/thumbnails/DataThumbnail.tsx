import React from "react";
import { useParams } from "react-router";
import { Thumbnail } from "../../../mikro/components/Thumbnail";

export interface DataExperimentProps {}

export const DataThumbnail: React.FC<DataExperimentProps> = (props) => {
  const { thumbnail } = useParams<{ thumbnail: string }>();
  if (!thumbnail) return <></>;
  return <Thumbnail id={thumbnail} />;
};

export default DataThumbnail;
