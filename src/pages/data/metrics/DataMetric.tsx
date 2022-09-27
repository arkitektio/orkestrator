import React from "react";
import { useParams } from "react-router";
import { Metric } from "../../../mikro/components/Metric";
import { Representation } from "../../../mikro/components/Representation";

export type IRepresentationScreenProps = {};

const DataMetric: React.FC<IRepresentationScreenProps> = () => {
  const { metric } = useParams<{ metric: string }>();
  if (!metric) return <></>;
  return <Metric id={metric} />;
};

export { DataMetric };
