import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { RekuestAction } from "@/linkers";
import {
  useActionOverviewQuery,
  useDetailActionQuery,
} from "@/rekuest/api/graphql";
import { ActionHeader } from "../components/action/ActionHeader";
import { ActionSignature } from "../components/action/ActionSignature";
import { ActionTaskHistory } from "../components/action/ActionTaskHistory";
import { ProvidedByPanel } from "../components/action/ProvidedByPanel";
import { SimilarActions } from "../components/action/SimilarActions";
import { LegacyActionTests, TestMatrix } from "../components/action/TestMatrix";
import { ActionUsageSidebar } from "../sidebars/ActionUsageSidebar";

export const ActionPage = asDetailQueryRoute(useDetailActionQuery, ({ data }) => {
  // The page describes the action; it does not run it (that is the "Run
  // Action" local action, in the context menu and the ObjectButton). What it
  // shows beyond the ports comes from a query of its own: DetailAction is the
  // assign payload every assign dialog loads, and should not grow with the page.
  const { data: overviewData } = useActionOverviewQuery({
    variables: { id: data.action.id },
  });
  const overview = overviewData?.action;

  return (
    <RekuestAction.ModelPage
      title={data.action.name}
      object={data.action}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestAction.Knowledge object={data?.action} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Usage">
            <ActionUsageSidebar id={data.action.id} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="p-6 space-y-6">
        <ActionHeader action={data.action} overview={overview} />

        <ActionSignature action={data.action} />

        {overview ? (
          <ProvidedByPanel implementations={overview.implementations} />
        ) : (
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
        )}

        {overview && overview.testCases && overview.testCases.length > 0 ? (
          <TestMatrix
            testCases={overview.testCases}
            implementations={overview.implementations}
          />
        ) : (
          data.action.tests.length > 0 && (
            <LegacyActionTests tests={data.action.tests} />
          )
        )}

        <SimilarActions id={data.action.id} />

        <ActionTaskHistory id={data.action.id} />
      </div>
    </RekuestAction.ModelPage>
  );
});


export default ActionPage;
