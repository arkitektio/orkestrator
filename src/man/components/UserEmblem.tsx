import { Link } from "react-router-dom";
import { useUserQuery } from "../api/graphql";
import { withMan } from "../man";

export const UserEmblem: React.FC<{ email: string }> = ({ email }) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { email: email },
  });

  return (
    <div className=" text-sm absolute right-0 bottom-0 translate-x-2 translate-y-2">
      <Link to={`/teams/users/${data?.user?.email}`}>
        <img
          className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
          src={
            data?.user?.avatar
              ? data?.user.avatar
              : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
          }
          alt=""
        />
      </Link>
    </div>
  );
};
