import { useDatalayer } from "@jhnnsrs/datalayer";
import { LokRelease, LokUser, RekuestProvision } from "../../../linker";
import { withLok } from "../../../lok/LokContext";
import { useReleaseQuery, useUserQuery } from "../../../lok/api/graphql";
import { MateFinder } from "../../../mates/types";
import { ListProvisionFragment } from "../../api/graphql";

interface ProvisionCardProps {
  provision: ListProvisionFragment;
  mates?: MateFinder[];
}

export const ProvisionCard = ({ provision, mates }: ProvisionCardProps) => {
  const { data: appdata } = withLok(useReleaseQuery)({
    variables: {
      clientId: provision.agent?.registry?.client?.clientId,
    },
    fetchPolicy: "cache-first",
  });

  const { data: userdata } = withLok(useUserQuery)({
    variables: { id: provision.agent?.registry?.user?.sub },
    fetchPolicy: "cache-first",
  });

  const { s3resolve } = useDatalayer();

  return (
    <RekuestProvision.Smart
      object={provision.id}
      className="rounded-md rounded bg-back-500 border-gray-800 border-1 relative p-2"
      mates={mates}
    >
      <div className="flex flex-row">
        <img
          className="h-10 w-10 rounded-md my-auto"
          src={
            appdata?.release?.logo
              ? s3resolve(appdata?.release?.logo)
              : `https://eu.ui-avatars.com/api/?name=${appdata?.release?.app?.identifier}&background=random`
          }
          alt=""
        />
        <div className="flex flex-col ml-2">
          {provision.agent && (
            <RekuestProvision.DetailLink
              object={provision.id}
              className="text-slate-800 "
            >
              {provision.id} on {provision.agent?.instanceId}
            </RekuestProvision.DetailLink>
          )}
          {appdata?.release && (
            <LokRelease.DetailLink
              object={appdata?.release?.id}
              className="text-slate-900"
            >
              {appdata.release.app?.identifier}:{appdata.release.version}
            </LokRelease.DetailLink>
          )}
        </div>
        {userdata?.user?.id && (
          <LokUser.DetailLink
            object={userdata?.user?.id}
            className="absolute bottom-0 right-0 p-1 transform translate-x-1/2 translate-y-1/2"
          >
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
        )}
      </div>
    </RekuestProvision.Smart>
  );
};
