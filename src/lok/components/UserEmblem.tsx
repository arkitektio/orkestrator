import { Link } from "react-router-dom";
import { User } from "../../linker";
import { useMikro, withMikro } from "../../mikro/MikroContext";
import { useUserQuery } from "../api/graphql";
import { withMan } from "../man";

export const UserEmblem: React.FC<{ sub: string }> = ({ sub }) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useMikro();
  return (
    <div className=" text-sm absolute right-0 bottom-0 translate-x-2 translate-y-2">
      {data?.user?.id && (
        <User.DetailLink object={data?.user?.id}>
          <img
            className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
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
