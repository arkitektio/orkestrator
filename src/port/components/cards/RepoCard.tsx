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
        <div className="flex">
          <PortGithubRepo.DetailLink
            object={repo.id}
            className="flex-grow font-semibold text-xs"
          >
            {repo?.user}/{repo?.repo}:{repo?.branch}
          </PortGithubRepo.DetailLink>
        </div>
      </div>
    </PortGithubRepo.Smart>
  );
};
