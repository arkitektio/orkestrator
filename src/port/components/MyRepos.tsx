import React from "react";
import {
  BsArrowDownCircleFill,
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { IconButton } from "../../components/buttons/IconButton";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { Modal } from "../../components/modals/Modal";
import { notEmpty } from "../../floating/utils";
import { GithubRepo } from "../../linker";
import {
  useScanRepoMutation,
  GithubReposDocument,
  useDeleteGithubRepoMutation,
  useGithubReposQuery,
} from "../api/graphql";
import { withPort } from "../PortContext";

export type IMyWhalesProps = {};

const MyRepos: React.FC<IMyWhalesProps> = ({}) => {
  const { data } = withPort(useGithubReposQuery)();
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
    <div>
      <span className="font-light text-xl text-white">My Repos</span>
      <br />
      <ResponsiveGrid>
        {data?.githubRepos?.filter(notEmpty).map((repo, index) => (
          <GithubRepo.Smart
            object={repo.id}
            key={index}
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
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyRepos };
