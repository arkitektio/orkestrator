import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { GithubRepo } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import {
  GithubReposDocument,
  ListGithubRepoFragment,
  useDeleteGithubRepoMutation,
  useScanRepoMutation,
} from "../../api/graphql";
import { withPort } from "../../PortContext";

interface RepoCardProps {
  repo: ListGithubRepoFragment;
  mates: MateFinder[];
}

export const RepoCard = ({ repo, mates }: RepoCardProps) => {
  const { confirm } = useConfirm();

  return (
    <GithubRepo.Smart
      object={repo.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      mates={mates}
    >
      <div className="p-2 ">
        <div className="flex">
          <GithubRepo.DetailLink
            object={repo.id}
            className="flex-grow font-semibold text-xs"
          >
            {repo?.user}/{repo?.repo}:{repo?.branch}
          </GithubRepo.DetailLink>
        </div>
      </div>
    </GithubRepo.Smart>
  );
};
