import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Acquisition } from "../../../mikro/components/Stage";
import { Experiment } from "../../../mikro/components/Experiment";

export interface DataStageProps {}

export const DataStage: React.FC<DataStageProps> = (props) => {
  const { stage } = useParams<{ stage: string }>();
  if (!stage) return <></>;
  return <Acquisition id={stage} />;
};
