import React from "react";
import { useParams } from "react-router";
import { Graph } from "../../../mikro/components/Graph";

export interface DataExperimentProps {}

export const DataGraph: React.FC<DataExperimentProps> = (props) => {
  const { graph } = useParams<{ graph: string }>();
  if (!graph) return <></>;
  return <Graph id={graph} />;
};

export default DataGraph;
