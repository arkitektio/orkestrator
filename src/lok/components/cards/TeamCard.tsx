import { useDatalayer } from "@jhnnsrs/datalayer";
import { Team } from "../../../linker";
import { ListGroupFragment } from "../../api/graphql";

interface TeamCardProps {
  group: ListGroupFragment;
}

export const TeamCard = ({ group }: TeamCardProps) => {
  const { s3resolve } = useDatalayer();

  return (
    <Team.Smart
      object={group.id}
      className="bg-back-800 p-3 text-white rounded-md rounded @container"
    >
      <div className="flex flex-row">
        <img
          height={64}
          width={64}
          src={
            group?.profile?.avatar
              ? s3resolve(group.profile?.avatar)
              : `https://eu.ui-avatars.com/api/?name=${group?.name}&background=random`
          }
          className="h-10 w-10 object-fit flex-initial aspect-h-1 aspect-w-1 rounded-md mr-2"
        />
        <Team.DetailLink
          object={group.id}
          className="flex-grow flex-col truncate"
        >
          <div className="text-xl font-light mb-1 flex truncate">
            {group?.profile?.name || group.name}
          </div>
          <div className="text-sm font-extralight">{group.name}</div>
        </Team.DetailLink>
      </div>
    </Team.Smart>
  );
};
