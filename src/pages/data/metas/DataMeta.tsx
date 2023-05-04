import React from "react";
import { useParams } from "react-router";
import { Meta } from "../../../mikro/components/Meta";

export type IRepresentationScreenProps = {};

const DataMeta: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  return <Meta id={id} />;
};

export { DataMeta };
