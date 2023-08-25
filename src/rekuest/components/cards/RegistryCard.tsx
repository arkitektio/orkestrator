import { useDatalayer } from "@jhnnsrs/datalayer";
import { LokApp, LokUser } from "../../../linker";
import { withLok } from "../../../lok/LokContext";
import { useAppQuery, useUserQuery } from "../../../lok/api/graphql";
import { RegistryFragment } from "../../api/graphql";

interface RegistryCardProps {
  registry: RegistryFragment;
}

export const RegistryCard = ({ registry }: RegistryCardProps) => {
  const { data: appdata } = withLok(useAppQuery)({
    variables: {
      identifier: registry.app?.identifier,
      version: registry.app?.version,
    },
    fetchPolicy: "cache-first",
  });
  const { data: userdata } = withLok(useUserQuery)({
    variables: { id: registry.user?.sub },
    fetchPolicy: "cache-first",
  });

  const { s3resolve } = useDatalayer();

  return (
    <div className="flex flex-row rounded">
      {appdata?.app?.id && (
        <LokApp.DetailLink object={appdata?.app?.id}>
          <div className="my-auto pr-1 bg-back-700 rounded-l p-1">
            {appdata.app.identifier}:{appdata.app.version}
          </div>
        </LokApp.DetailLink>
      )}
      {userdata?.user?.id ? (
        <LokUser.DetailLink
          object={userdata?.user?.id}
          className="flex flex-row my-auto bg-back-500 rounded-r p-1"
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
        </LokUser.DetailLink>
      ) : (
        "Anonymous"
      )}
    </div>
  );
};
