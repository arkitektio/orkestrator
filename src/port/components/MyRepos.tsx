import React from "react";
import { ListRender } from "../../layout/SectionTitle";
import { useDeleteGithubRepoMate } from "../../mates/repo/useDeleteGithubRepoMate";
import { useGithubRepoLifecycleMate } from "../../mates/repo/useGithubRepoLifecycleMate";
import { withPort } from "../PortContext";
import { useGithubReposQuery } from "../api/graphql";
import { RepoCard } from "./cards/RepoCard";

export type IMyWhalesProps = {};

const MyRepos: React.FC<IMyWhalesProps> = ({}) => {
  const { data, refetch } = withPort(useGithubReposQuery)({
    variables: { limit: 20 },
  });

  const deleteRepoMate = useDeleteGithubRepoMate();
  const repoLF = useGithubRepoLifecycleMate();

  return (
    <div>
      <ListRender title="My Repos" array={data?.githubRepos} refetch={refetch}>
        {(repo, index) => (
          <RepoCard
            repo={repo}
            key={index}
            mates={[repoLF, deleteRepoMate(repo)]}
          />
        )}
      </ListRender>
    </div>
  );
};

export { MyRepos };
