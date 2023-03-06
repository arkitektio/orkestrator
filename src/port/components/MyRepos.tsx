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
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
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
import { RepoCard } from "./cards/RepoCard";

export type IMyWhalesProps = {};

const MyRepos: React.FC<IMyWhalesProps> = ({}) => {
  const { data } = withPort(useGithubReposQuery)();

  return (
    <div>
      <span className="font-light text-xl text-white">My Repos</span>
      <br />
      <ResponsiveContainerGrid>
        {data?.githubRepos?.filter(notEmpty).map((repo, index) => (
          <RepoCard repo={repo} key={index} />
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyRepos };
