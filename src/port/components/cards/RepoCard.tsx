import { PortGithubRepo } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { useConfirm } from "../../../providers/confirmer/confirmer-context";
import { ListGithubRepoFragment } from "../../api/graphql";

interface RepoCardProps {
  repo: ListGithubRepoFragment;
  mates: MateFinder[];
}

export const RepoCard = ({ repo, mates }: RepoCardProps) => {
  const { confirm } = useConfirm();

  return (
    <PortGithubRepo.Smart
      object={repo.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      mates={mates}
    >
      <div className="p-2 ">
        <div className="flex flex-col truncate">
          <PortGithubRepo.DetailLink
            object={repo.id}
            className="flex-grow font-semibold text-2xl"
          >
            {repo?.repo}
          </PortGithubRepo.DetailLink>
          <div className="text-xs">
            {repo?.user}/{repo?.repo}:{repo?.branch}
          </div>
        </div>
      </div>
    </PortGithubRepo.Smart>
  );
};
