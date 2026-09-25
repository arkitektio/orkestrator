import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { useMeQuery, useMyContextQuery } from "../api/graphql";

export const Me = () => {
  const { data } = useMeQuery();
  const resolve = useLokResolve();

  return (
    <Avatar className="border-seperator border-border mx-auto cursor-pointer rounded-md">
      <AvatarImage
        src={resolve(data?.me?.profile.avatar?.presignedUrl)}
        alt={data?.me?.username}
        className="border-seperator rounded-md"
      />
      <AvatarFallback className="border-seperator">
        {data?.me.username.slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );
};

export const Username = () => {
  const { data } = useMyContextQuery();

  return (
    <>
      {data?.mycontext.user?.username}
    </>
  );
};
