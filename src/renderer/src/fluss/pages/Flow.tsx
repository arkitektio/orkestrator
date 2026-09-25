import { Guard } from "@/app/Arkitekt";
import { useFlowQuery } from "@/fluss/api/graphql";
import { EditFlow } from "@/fluss/edit/EditFlow";
import { useParams } from "react-router-dom";

/** A single (immutable) flow version: shown in the editor without a save path. */
export const FlowDetail = (props: { id: string }) => {
  const { data, error } = useFlowQuery({ variables: { id: props.id } });

  if (error) return <div className="p-4 text-sm text-destructive">{error.message}</div>;
  return <>{data?.flow && <EditFlow flow={data.flow} />}</>;
};

function Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return <div>Missing id</div>;
  }

  return (
    <Guard.Fluss>
      <FlowDetail id={id} />
    </Guard.Fluss>
  );
}

export default Page;
