import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { GithubRepo } from "../../../linker";
import {
  GithubReposDocument,
  ListGithubRepoFragment,
  useDeleteGithubRepoMutation,
  useScanRepoMutation,
} from "../../api/graphql";
import { withPort } from "../../PortContext";

interface RepoCardProps {
  repo: ListGithubRepoFragment;
}

export const RepoCard = ({ repo }: RepoCardProps) => {
  const [deleteRepo] = withPort(useDeleteGithubRepoMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: GithubReposDocument,
      });
      cache.writeQuery({
        query: GithubReposDocument,
        data: {
          githubRepos: existing.githubRepos.filter(
            (t: any) => t.id !== result.data?.deleteGithubRepo?.id
          ),
        },
      });
    },
  });

  const [scanRepo, _] = withPort(useScanRepoMutation)();

  const { confirm } = useConfirm();

  return (
    <GithubRepo.Smart
      object={repo.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      additionalMates={(accept, self) => {
        if (!self) return [];

        if (accept == "item:@port/githubrepo") {
          return [
            {
              accepts: [accept],
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await deleteRepo({ variables: { id: self.object } });
              },
              label: <BsTrash />,
              description: "Delete Run",
            },
            {
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to deploy this whale?",
                  confirmLabel: "Yes deploy!",
                });

                await scanRepo({ variables: { id: self.object } });
              },
              label: "Scan",
              description: "Scan Repo",
            },
          ];
        }

        return [];
      }}
    >
      <div className="p-2 ">
        <div className="flex">
          <GithubRepo.DetailLink
            object={repo.id}
            className="flex-grow font-semibold text-xs"
          >
            {repo?.user}/{repo?.repo}:{repo?.branch}
          </GithubRepo.DetailLink>
          <span
            className="flex-none mt-1 text-white cursor-pointer group-hover:text-red-400"
            onClick={() => {
              if (repo?.id) {
                confirm({
                  message: "Do you really want to delete this Whale?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                })
                  .then(() => {
                    deleteRepo({
                      variables: { id: repo?.id },
                    });
                  })
                  .catch(console.log);
              }
            }}
          >
            <BsTrash />
          </span>
        </div>
      </div>
    </GithubRepo.Smart>
  );
};
