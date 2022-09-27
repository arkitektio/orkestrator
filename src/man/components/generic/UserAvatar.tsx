import { useUserQuery } from "../../../man/api/graphql";
import { withMan } from "../../man";

export const UserAvatar: React.FC<{ email: string }> = ({ email }) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { email: email },
  });

  return (
    <div className="bg-gray-800 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
      {data?.user?.avatar && (
        <img className="h-8 w-8 rounded-full" src={data.user.avatar} alt="" />
      )}
      <span className="ml-2 mr-2 my-auto sm:mt-1 text-gray-200">
        {data?.user?.username}
      </span>
    </div>
  );
};
