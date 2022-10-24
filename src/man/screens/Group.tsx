import React from "react";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { Modal } from "../../components/modals/Modal";
import { notEmpty } from "../../floating/utils";
import { Representation, Team, User } from "../../linker";
import { useRepresentationsForQuery } from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { useDetailGroupQuery } from "../api/graphql";
import { UploadGroupAvatarModal } from "../components/dialogs/UploadGroupAvatarModal";
import { UserEmblem } from "../components/UserEmblem";
import { withMan } from "../man";

export type GroupProps = {
  id: string;
};

export const RepresentationsForGroup = ({ name }: { name: string }) => {
  const { data } = withMikro(useRepresentationsForQuery)({
    variables: { group: name },
  });

  return (
    <>
      <ResponsiveGrid>
        {data?.representationsForGroup?.filter(notEmpty).map((u, index) => (
          <Representation.DetailLink
            object={u.id}
            className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black"
          >
            <div className="flex">
              <span className="flex-grow cursor-pointer font-semibold">
                {u?.name}
              </span>
            </div>
          </Representation.DetailLink>
        ))}
      </ResponsiveGrid>
    </>
  );
};

const Group: React.FC<GroupProps> = ({ id }) => {
  const { data } = withMan(useDetailGroupQuery)({
    variables: { id: id },
  });

  return (
    <div className="dark:text-white grid grid-rows-6">
      <div
        className="text-6xl font-light row-span-2 p-5 border rounded-lg"
        style={
          data?.group?.avatar
            ? {
                backgroundImage: `url(${data?.group?.avatar}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
                backgroundRepeat: "no-repeat",
                backgroundBlendMode: "multiply",
                backgroundSize: "cover",
              }
            : {
                background:
                  "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95))",
              }
        }
      >
        {data?.group?.name}
      </div>
      <div className="text-md mt-2">
        <div className="text-xl font-light">Members of this Group</div>
        <ResponsiveGrid>
          {data?.group?.userSet?.map((u, index) => (
            <User.DetailLink
              object={u.id}
              className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black relative"
            >
              <div className="flex">
                <span className="flex-grow cursor-pointer font-semibold">
                  {u.username}
                </span>
              </div>
              <UserEmblem email={u.email} />
            </User.DetailLink>
          ))}
        </ResponsiveGrid>
        <div className="text-xl font-light">My Shared Data with this Team</div>
        {data?.group?.name && (
          <RepresentationsForGroup name={data?.group?.name} />
        )}

        <div className="absolute bottom-0 right-0 mr-4 mb-4">
          {data?.group?.id && (
            <Modal
              child={
                <button className="bg-primary-300 hover:bg-primary-400 text-salte-50 font-bold py-2 px-4 rounded-full">
                  Edit
                </button>
              }
            >
              <UploadGroupAvatarModal id={data?.group?.id} />
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

export { Group };
