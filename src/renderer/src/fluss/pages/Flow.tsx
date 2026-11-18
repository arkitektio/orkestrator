import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import { FlussFlow } from "@/core/linkers";
import { useFlowQuery } from "@/fluss/api/graphql";
import { EditFlow } from "@/fluss/edit/EditFlow";
import { RekuestGuard } from "@/rekuest/api/hooks";
import { useParams } from "react-router-dom";
import { RunFlowButton } from "../components/RunFlowButton";

/** A single (immutable) flow version: shown in the editor without a save path, and run from here. */
export const FlowDetail = (props: { id: string }) => {
  const { data, error, refetch } = useFlowQuery({ variables: { id: props.id } });

  if (error && !data) return <QueryError error={error} onRetry={() => refetch()} resource="flow" id={props.id} />;
  if (!data?.flow) return null;
  return (
    <FlussFlow.ModelPage
      object={data.flow}
      title={data.flow.title}
      pageActions={
        // Where it is deployed is rekuest's to say.
        <RekuestGuard fallback={<></>}>
          <RunFlowButton flow={data.flow} />
        </RekuestGuard>
      }
    >
      <EditFlow flow={data.flow} />
    </FlussFlow.ModelPage>
  );
};

function Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <NotFound />;

  return <FlowDetail id={id} />;
}

export default Page;
