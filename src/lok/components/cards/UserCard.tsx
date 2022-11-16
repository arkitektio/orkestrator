import React from "react";
import { User } from "../../../linker";
import { useMikro } from "../../../mikro/MikroContext";
import { ListUserFragment } from "../../api/graphql";

interface UserCardProps {
  user: ListUserFragment;
}

export const UserCard = ({ user }: UserCardProps) => {
  const { s3resolve } = useMikro();

  return (
    <User.Smart
      object={user.id}
      className="bg-back-800 p-3 text-white rounded-md rounded @container cursor-pointer"
    >
      <User.DetailLink object={user.id} className="flex flex-row">
        <img
          height={64}
          width={64}
          src={
            user?.profile?.avatar
              ? s3resolve(user.profile?.avatar)
              : `https://eu.ui-avatars.com/api/?name=${user?.username}&background=random`
          }
          className="h-10 w-10 object-fit flex-initial aspect-h-1 aspect-w-1 rounded-md mr-2"
        />
        <User.DetailLink
          object={user.id}
          className="flex-grow flex-col truncate"
        >
          <div className="text-xl font-light mb-1 hidden @xs:block flex">
            {user.firstName
              ? user.firstName + " " + user.lastName
              : user.username}
          </div>
          <div className="text-sm font-extralight hidden @sm:block">
            {user.username}
          </div>
        </User.DetailLink>
      </User.DetailLink>
    </User.Smart>
  );
};
