import React from "react";
import { useParams } from "react-router";
import { GithubRepo } from "../../../port/components/GithubRepo";
import { RepoScan } from "../../../port/components/RepoScan";
import { Whale } from "../../../port/components/Whale";

export interface DataExperimentProps {}

export const PortRepoScan: React.FC<DataExperimentProps> = (props) => {
  const { scan } = useParams<{ scan: string }>();
  if (!scan) return <></>;
  return <RepoScan id={scan} />;
};
