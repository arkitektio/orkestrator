import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Objective } from "../../../mikro/components/Objective";
import { Position } from "../../../mikro/components/Position";

export interface DataObjectiveProps {}

export const DataObjective: React.FC<DataObjectiveProps> = (props) => {
  const { objective } = useParams<{ objective: string }>();
  if (!objective) return <></>;
  return <Objective id={objective} />;
};
