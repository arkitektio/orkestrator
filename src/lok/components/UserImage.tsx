import { useDatalayer } from "@jhnnsrs/datalayer";
import { LokUser } from "../../linker";
import { withLok } from "../LokContext";
import { useUserQuery } from "../api/graphql";

export const UserImage: React.FC<{ sub: string; className?: string }> = ({
  sub,
  className,
}) => {
  const { data, error } = withLok(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useDatalayer();
  return (
    <>
      {data?.user?.id && (
        <LokUser.DetailLink object={data?.user?.id}>
          <img
            className={
              className ||
              "h-8 w-8 rounded-full ring-pink-200 ring-2 hover:ring-pink-500 hover:ring-2 cursor-pointer"
            }
            src={
              data?.user?.profile?.avatar
                ? s3resolve(data?.user?.profile.avatar)
                : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
            }
            alt=""
          />
        </LokUser.DetailLink>
      )}
    </>
  );
};
