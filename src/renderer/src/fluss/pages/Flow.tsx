import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import { useFlowQuery } from "@/fluss/api/graphql";
import { EditFlow } from "@/fluss/edit/EditFlow";
import { useParams } from "react-router-dom";

/** A single (immutable) flow version: shown in the editor without a save path. */
export const FlowDetail = (props: { id: string }) => {
  const { data, error, refetch } = useFlowQuery({ variables: { id: props.id } });

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} resource="flow" id={props.id} />;
  return <>{data?.flow && <EditFlow flow={data.flow} />}</>;
};

function Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <NotFound />;

  return <FlowDetail id={id} />;
}

export default Page;
