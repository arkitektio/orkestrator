import React from "react";
import { useParams } from "react-router";
import { Channel } from "../../../mikro/components/Channel";

export type IRepresentationScreenProps = {};

const DataChannel: React.FC<IRepresentationScreenProps> = () => {
  const { channel } = useParams<{ channel: string }>();
  if (!channel) return <></>;
  return <Channel id={channel} />;
};

export { DataChannel };
