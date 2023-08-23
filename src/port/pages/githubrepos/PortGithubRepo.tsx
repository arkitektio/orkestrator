import React from "react";
import { useParams } from "react-router";
import { GithubRepo } from "../../../port/components/GithubRepo";
import { Whale } from "../../../port/components/Whale";

export interface DataExperimentProps {}

export const PortGithubRepo: React.FC<DataExperimentProps> = (props) => {
  const { repo } = useParams<{ repo: string }>();
  if (!repo) return <></>;
  return <GithubRepo id={repo} />;
};
