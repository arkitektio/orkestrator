import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Dataset } from "../../../mikro/components/Dataset";
import { Experiment } from "../../../mikro/components/Experiment";

export interface DataExperimentProps {}

export const DataDataset: React.FC<DataExperimentProps> = (props) => {
  const { dataset } = useParams<{ dataset: string }>();
  if (!dataset) return <></>;
  return <Dataset id={dataset} />;
};
