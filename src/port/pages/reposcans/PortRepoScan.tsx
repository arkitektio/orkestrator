import React from "react";
import { useParams } from "react-router";
import { GithubRepo } from "../../../port/components/GithubRepo";
import { Deployment } from "../../../port/components/Deployment";
import { Whale } from "../../../port/components/Whale";

export interface DataExperimentProps {}

export const PortRepoScan: React.FC<DataExperimentProps> = (props) => {
  const { scan } = useParams<{ scan: string }>();
  if (!scan) return <></>;
  return <Deployment id={scan} />;
};
