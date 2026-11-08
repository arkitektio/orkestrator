import { useMyContextQuery } from "../api/graphql";

export const Username = () => {
  const { data } = useMyContextQuery();

  return (
    <>
      {data?.mycontext.user?.username}
    </>
  );
};
