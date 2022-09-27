import React from "react";
import { BsPlusCircle } from "react-icons/bs";
import { AddButton } from "../components/buttons/AddButton";
import { Modal } from "../components/modals/Modal";
import { MyTeams } from "../components/MyTeams";
import { SharedRepresentations } from "../components/SharedRepresentations";
import { SectionTitle } from "../layout/SectionTitle";
import {
  useProfileQuery,
  useUploadAvatarMutation,
  UploadAvatarMutationVariables,
} from "../man/api/graphql";
import { ChangeMeModal } from "../man/components/dialogs/ChangeMeModal";
import { UploadAvatarModal } from "../man/components/dialogs/UploadAvatarModal";
import { withMan } from "../man/context";

interface Props {}

export const Profile: React.FC<Props> = (props) => {
  const { data } = withMan(useProfileQuery)();

  return (
    <div className="p-5">
      {" "}
      <SectionTitle>{data?.me?.username}</SectionTitle>
      <div className={"md:px-auto px-4"}>
        <SectionTitle>Avatars</SectionTitle>
        <div className={"md:px-auto px-4 flex flex-row"}>
          {data?.me?.avatar && (
            <img
              src={data?.me?.avatar}
              className={"md:px-auto px-4 w-20 "}
              alt="The users profile"
            />
          )}
          <Modal
            child={
              <AddButton>
                <BsPlusCircle />
              </AddButton>
            }
          >
            <UploadAvatarModal />
          </Modal>
        </div>
        {data?.me && (
          <Modal child={<button>Change Me</button>}>
            <ChangeMeModal me={data?.me} />
          </Modal>
        )}
      </div>
    </div>
  );
};
