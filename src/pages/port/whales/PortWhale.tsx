import React from "react";
import { useParams } from "react-router";
import { Whale } from "../../../port/components/Whale";

export interface DataExperimentProps {}

export const PortWhale: React.FC<DataExperimentProps> = (props) => {
  const { whale } = useParams<{ whale: string }>();
  if (!whale) return <></>;
  return <Whale id={whale} />;
};
