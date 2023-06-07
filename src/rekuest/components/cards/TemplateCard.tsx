import { Release, Template, User } from "../../../linker";
import { useReleaseQuery, useUserQuery } from "../../../lok/api/graphql";
import { withMan } from "../../../lok/man";
import { MateFinder } from "../../../mates/types";
import { useMikro } from "../../../mikro/MikroContext";
import { ListTemplateFragment } from "../../api/graphql";

interface TemplateCardProps {
  template: ListTemplateFragment;
  mates?: MateFinder[];
}

export const TemplateCard = ({ template, mates }: TemplateCardProps) => {
  const { data: appdata } = withMan(useReleaseQuery)({
    variables: {
      clientId: template?.agent?.registry?.client?.clientId,
    },
    fetchPolicy: "cache-first",
  });
  const { data: userdata } = withMan(useUserQuery)({
    variables: { id: template?.agent?.registry?.user?.sub },
    fetchPolicy: "cache-first",
  });

  const { s3resolve } = useMikro();

  return (
    <Template.Smart
      mates={mates}
      object={template.id}
      className="rounded-md rounded bg-back-500 border-gray-800 border-1 relative p-2"
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
          <Template.DetailLink object={template.id} className="text-slate-800">
            {template.interface}
          </Template.DetailLink>
          {appdata?.release?.id && (
            <Release.DetailLink
              object={appdata?.release?.id}
              className="text-slate-900"
            >
              {appdata.release.app.identifier}:{appdata.release.version}
            </Release.DetailLink>
          )}
        </div>
        {userdata?.user?.id && (
          <User.DetailLink
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
          </User.DetailLink>
        )}
      </div>
    </Template.Smart>
  );
};
