import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { FlussRun } from "@/core/linkers";
import { useGetRunQuery } from "@/fluss/api/graphql";
import { TrackFlow } from "../track/TrackFlow";
import { FLUSS_HELP } from "../help";

export const Page = asDetailQueryRoute(useGetRunQuery, ({ data }) => {
  return (
    <FlussRun.ModelPage
      object={data.run}
      title={"Run for " + data.run.flow.title}
      help={FLUSS_HELP.run}
    >
      <TrackFlow run={data.run} />
    </FlussRun.ModelPage>
  );
});

export default Page;
