import { Link } from "react-router-dom";
import { App, User } from "../../linker";
import { useAppQuery, useUserQuery } from "../api/graphql";
import { withMan } from "../man";

export const AppEmblem: React.FC<{ version: string; identifier: string }> = ({
  version,
  identifier,
}) => {
  const { data, error } = withMan(useAppQuery)({
    variables: { identifier, version },
  });

  return (
    <div className=" text-sm absolute right-0 bottom-0 translate-x-2 translate-y-2">
      {data?.app?.id && (
        <App.DetailLink object={data?.app?.id}>
          <img
            className="h-8 w-8 rounded-full hover:ring-pink-500 hover:ring-2 cursor-pointer"
            src={
              data?.app?.logo
                ? data?.app.logo
                : `https://eu.ui-avatars.com/api/?name=${data?.app?.identifier}&background=random`
            }
            alt=""
          />
        </App.DetailLink>
      )}
    </div>
  );
};
