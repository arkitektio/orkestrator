import React from "react";
import { Agent, App, Provision, Template, User } from "../../../linker";
import { useAppQuery, useUserQuery } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/man";
import { MateFinder } from "../../../mates/types";
import { useMikro } from "../../../mikro/MikroContext";
import { ListProvisionFragment, ListTemplateFragment } from "../../api/graphql";

interface ProvisionCardProps {
  provision: ListProvisionFragment;
  mates?: MateFinder[];
}

export const ProvisionCard = ({ provision, mates }: ProvisionCardProps) => {
  const { data: appdata } = withMan(useAppQuery)({
    variables: {
      identifier: provision.agent?.registry?.app?.identifier,
      version: provision.agent?.registry?.app?.version,
    },
    fetchPolicy: "cache-first",
  });

  
  const { data: userdata } = withMan(useUserQuery)({
    variables: { id: provision.agent?.registry?.user?.sub },
    fetchPolicy: "cache-first",
  });

  const { s3resolve } = useMikro();

  return (
    <Provision.Smart
      object={provision.id}
      className="rounded-md rounded bg-back-500 border-gray-800 border-1"
      mates={mates}
    >
      <div className="flex flex-col">
        {provision.agent && (
          <Provision.DetailLink object={provision.id}>
            <pre className="bg-back-900 text-white p-1">
              {provision.id} {provision.agent?.instanceId}
            </pre>
          </Provision.DetailLink>
        )}
        {appdata?.app?.id && (
          <App.DetailLink
            object={appdata?.app?.id}
            className="my-auto pr-1   p-1"
          >
            {appdata.app.identifier}:{appdata.app.version}
          </App.DetailLink>
        )}
        {userdata?.user?.id ? (
          <User.DetailLink
            object={userdata?.user?.id}
            className="flex flex-row my-auto p-1 bg-back-700"
          >
            <div className="my-auto mr-2">{userdata.user.username}</div>
            <img
              className="h-6 w-6 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
              src={
                userdata?.user?.profile?.avatar
                  ? s3resolve(userdata?.user?.profile.avatar)
                  : `https://eu.ui-avatars.com/api/?name=${userdata?.user?.username}&background=random`
              }
              alt=""
            />
          </User.DetailLink>
        ) : (
          "Anonymous"
        )}
      </div>
    </Provision.Smart>
  );
};
