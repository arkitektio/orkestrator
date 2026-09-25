import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { FlussRun } from "@/core/linkers";
import { useFlowQuery, useGetRunQuery } from "@/fluss/api/graphql";
import { EditFlow } from "@/fluss/edit/EditFlow";
import { TrackFlow } from "../track/TrackFlow";

export const FlowDetail = (props: { id: string }) => {
  const { data, error } = useFlowQuery({
    variables: {
      id: props.id,
    },
  });

  console.log(error?.message, data);

  return <>{data?.flow && <EditFlow flow={data.flow} />}</>;
};

export const Page = asDetailQueryRoute(useGetRunQuery, ({ data }) => {
  return (
    <FlussRun.ModelPage
      object={data.run}
      title={"Run for " + data.run.flow.title}
    >
      <TrackFlow run={data.run} />
    </FlussRun.ModelPage>
  );
});


export default Page;
