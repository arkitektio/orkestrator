import React from "react";
import { BsArrowDownCircleFill } from "react-icons/bs";
import { CreateGithubRepoModal } from "../../port/components/dialogs/CreateGithubRepoModal";
import { IconButton } from "../buttons/IconButton";
import { Modal } from "../modals/Modal";

export type IWhalesSidebarProps = {};

const WhalesSidebar: React.FC<IWhalesSidebarProps> = ({}) => {
  return (
    <div className={"ml-2"}>
      <Modal
        child={
          <IconButton icon={<BsArrowDownCircleFill />}>New Whale</IconButton>
        }
      >
        <CreateGithubRepoModal />
      </Modal>
    </div>
  );
};

export { WhalesSidebar };
