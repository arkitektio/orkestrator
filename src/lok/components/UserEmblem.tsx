import { useDatalayer } from "@jhnnsrs/datalayer";
import { User } from "../../linker";
import { withLok } from "../LokContext";
import { useUserQuery } from "../api/graphql";

export const UserEmblem: React.FC<{ sub: string }> = ({ sub }) => {
  const { data, error } = withLok(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useDatalayer();
  return (
    <div className=" text-sm absolute right-0 bottom-0 translate-x-2 translate-y-2">
      {data?.user?.id && (
        <User.DetailLink object={data?.user?.id}>
          <img
            className="h-8 w-8 rounded-full ring-pink-200 ring-2 hover:ring-pink-500 hover:ring-2 cursor-pointer"
            src={
              data?.user?.profile?.avatar
                ? s3resolve(data?.user?.profile.avatar)
                : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
            }
            alt=""
          />
        </User.DetailLink>
      )}
    </div>
  );
};
