import { App, User } from "../../linker";
import { useAppQuery, useUserQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/man";
import { useMikro } from "../../mikro/MikroContext";
import { RegistryFragment } from "../api/graphql";

export const RegistryTag = ({ registry }: { registry: RegistryFragment }) => {
  const { data: appdata } = withMan(useAppQuery)({
    variables: {
      identifier: registry.app?.identifier,
      version: registry.app?.version,
    },
    fetchPolicy: "cache-first",
  });
  const { data: userdata } = withMan(useUserQuery)({
    variables: { id: registry.user?.sub },
    fetchPolicy: "cache-first",
  });

  const { s3resolve } = useMikro();

  return (
    <div className="flex flex-row rounded">
      {appdata?.app?.id && (
        <App.DetailLink object={appdata?.app?.id}>
          <div className="my-auto pr-1 bg-back-700 rounded-l p-1">
            {appdata.app.identifier}:{appdata.app.version}
          </div>
        </App.DetailLink>
      )}
      {userdata?.user?.id ? (
        <User.DetailLink
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
        </User.DetailLink>
      ) : (
        "Anonymous"
      )}
    </div>
  );
};
