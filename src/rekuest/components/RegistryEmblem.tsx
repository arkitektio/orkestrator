import { App, User } from "../../linker";
import { useAppQuery, useUserQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/man";
import { useMikro } from "../../mikro/MikroContext";
import { RegistryFragment } from "../api/graphql";

export const RegistryEmblem = ({
  registry,
}: {
  registry: RegistryFragment;
}) => {
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
    <div className="text-sm absolute right-0 bottom-0 translate-x-2 translate-y-2">
      {appdata?.app?.id && (
        <App.DetailLink object={appdata?.app?.id}>
          <img
            className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
            src={
              appdata?.app?.logo
                ? s3resolve(appdata?.app.logo)
                : `https://eu.ui-avatars.com/api/?name=${appdata.app.identifier}&background=random`
            }
            alt=""
          />
        </App.DetailLink>
      )}
      {userdata?.user?.id && (
        <User.DetailLink object={userdata?.user?.id}>
          <img
            className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
            src={
              userdata?.user?.profile?.avatar
                ? s3resolve(userdata?.user.profile?.avatar)
                : `https://eu.ui-avatars.com/api/?name=${userdata?.user?.username}&background=random`
            }
            alt=""
          />
        </User.DetailLink>
      )}
    </div>
  );
};
