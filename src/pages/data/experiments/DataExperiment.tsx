import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Experiment } from "../../../mikro/components/Experiment";

export interface DataExperimentProps {}

export const DataExperiment: React.FC<DataExperimentProps> = (props) => {
  const { experiment } = useParams<{ experiment: string }>();
  if (!experiment) return <></>;
  return <Experiment id={experiment} />;
};
