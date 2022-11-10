import React from "react";
import {
  BsArrowDownCircleFill,
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import {
  GithubReposDocument,
  useDeleteGithubRepoMutation,
  useGithubReposQuery,
} from "../port/api/graphql";
import { CreateWhaleModal } from "../port/components/dialogs/CreateWhaleModal";
import { withPort } from "../port/PortContext";
import { IconButton } from "./buttons/IconButton";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { Modal } from "./modals/Modal";

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

  const { confirm } = useConfirm();

  return (
    <div>
      <span className="font-light text-xl">My Repos</span>
      <br />
      <ResponsiveGrid>
        {data?.githubRepos?.map((repo, index) => (
          <div
            key={index}
            className="max-w-sm rounded overflow-hidden shadow-md bg-white group"
          >
            <div className="p-2 ">
              <div className="flex">
                <span className="flex-grow font-semibold text-xs">
                  {repo?.user}/{repo?.repo}:{repo?.branch}
                </span>
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
            <div className="pl-2 pb-2">
              {repo?.id && (
                <Modal
                  child={
                    <IconButton icon={<BsArrowDownCircleFill />}>
                      New Whale
                    </IconButton>
                  }
                >
                  <CreateWhaleModal />
                </Modal>
              )}
            </div>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyRepos };
