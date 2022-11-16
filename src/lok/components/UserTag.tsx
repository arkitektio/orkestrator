import { Link } from "react-router-dom";
import { User } from "../../linker";
import { useMikro, withMikro } from "../../mikro/MikroContext";
import { useUserQuery } from "../api/graphql";
import { withMan } from "../man";

export const UserTag: React.FC<{ sub: string }> = ({ sub }) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useMikro();
  return (
    <div className="flex flex-row">
      {data?.user?.id ? (
        <User.DetailLink
          object={data?.user?.id}
          className="flex flex-row p-1 bg-back-700 rounded"
        >
          <div className="my-auto mr-2">{data.user.username}</div>
          <img
            className="h-6 w-6 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
            src={
              data?.user?.profile?.avatar
                ? s3resolve(data?.user?.profile.avatar)
                : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
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
