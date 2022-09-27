import React from "react";
import { useParams } from "react-router";
import { DetailGithubRepo } from "../../port/components/screens/DetailGithubRepo";

export type ISampleScreenProps = {};

const GithubRepoScreen: React.FC<ISampleScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  return (
    <div className="h-screen">
      <DetailGithubRepo id={id} />
    </div>
  );
};

export { GithubRepoScreen };
