import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Context } from "../../../mikro/components/Context";
import { Experiment } from "../../../mikro/components/Experiment";

export interface DataExperimentProps {}

export const DataContext: React.FC<DataExperimentProps> = (props) => {
  const { context } = useParams<{ context: string }>();
  if (!context) return <></>;
  return <Context id={context} />;
};

export default DataContext;
