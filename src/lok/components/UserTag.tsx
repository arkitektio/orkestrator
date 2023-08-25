import { useDatalayer } from "@jhnnsrs/datalayer";
import { LokUser } from "../../linker";
import { withLok } from "../LokContext";
import { useUserQuery } from "../api/graphql";

export const UserTag: React.FC<{ sub: string; className?: string }> = ({
  sub,
  className,
}) => {
  const { data, error } = withLok(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useDatalayer();
  return (
    <div className={className}>
      {data?.user?.id ? (
        <LokUser.DetailLink
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
        </LokUser.DetailLink>
      ) : (
        "Anonymous"
      )}
    </div>
  );
};
