import { LoadingPage } from "@/core/app/components/fallbacks/LoadingPage";
import { LokUser } from "@/core/linkers";
import { Navigate } from "react-router-dom";
import { useMyContextQuery } from "../api/graphql";

/** Your profile is a member profile like any other — yours, in this organization. */
const Page = () => {
  const { data } = useMyContextQuery();
  if (!data) return <LoadingPage />;
  return <Navigate replace to={LokUser.linkBuilder(data.mycontext.user.id)} />;
};

export default Page;
