import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Context } from "../../../mikro/components/Context";
import { Experiment } from "../../../mikro/components/Experiment";
import { Model } from "../../../mikro/components/Model";

export interface DataExperimentProps {}

export const DataModel: React.FC<DataExperimentProps> = (props) => {
  const { model } = useParams<{ model: string }>();
  if (!model) return <></>;
  return <Model id={model} />;
};

export default DataModel;
