import React from "react";
import { useParams } from "react-router";
import { Timepoint } from "../../../mikro/components/Timepoint";

export interface DataStageProps {}

export const DataTimepoint: React.FC<DataStageProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  return <Timepoint id={id} />;
};
