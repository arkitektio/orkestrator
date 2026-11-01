import { asGraphScopeQueryRoute } from "@/kraph/routes/graphRoutes";
import { FormSheet } from "@/core/dialogs/FormDialog";
import { reportErrorAs } from "@/core/notify";
import { Sidebars } from "@/core/layout/Sidebars";
import { KraphGraph } from "@/core/linkers";
import { HobbyKnifeIcon } from "@radix-ui/react-icons";
import {
  useGetGraphQuery,
  useUpdateGraphMutation,
} from "../api/graphql";

import { PageAction } from "@/core/ui/page-action";
import OntologyGraph from "../components/designer/OntologyGraph";
import { ProjectionBadge } from "../components/ProjectionBadge";
import { ViewWords } from "../components/knowledge/ViewWords";
import ScatterPlotList from "../components/lists/ScatterPlotList";
import { UpdateGraphForm } from "../forms/UpdateGraphForm";
import { KRAPH_HELP } from "../help";

// The index of `graphs/:graph`: the graph comes from scope, not from a `:id`
// segment this route does not have.
export const Page = asGraphScopeQueryRoute(useGetGraphQuery, ({ data, refetch }) => {
  const [update] = useUpdateGraphMutation({
    refetchQueries: ["GetGraph"],
  });



  const pin = async () => {
    await update({
      variables: {
        input: {
          id: data.graph.id,
          pin: !data.graph.pinned,
        },
      },
    });
    await refetch();
  };

  return (
    <KraphGraph.ModelPage
      help={KRAPH_HELP.graph}
      object={data.graph}
      title={data.graph.name}
      pageActions={
        <>
          <FormSheet
            trigger={
              <PageAction aria-label="Edit view">
                <HobbyKnifeIcon />
              </PageAction>
            }
          >
            {data?.graph && <UpdateGraphForm graph={data?.graph} />}
          </FormSheet>
          <KraphGraph.ObjectButton alwaysShow object={data.graph} />
          <KraphGraph.DetailLink object={data.graph} subroute="queries">
            <PageAction size="sm">Queries</PageAction>
          </KraphGraph.DetailLink>
          <PageAction
            priority={-10}
            onClick={() => {
              pin().catch(reportErrorAs(data.graph.pinned ? "Couldn't unpin the view" : "Couldn't pin the view"));
            }}
          >
            {data.graph.pinned ? "Unpin" : "Pin"}
          </PageAction>

        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Words">
            <ViewWords graph={data.graph.id} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Plots">
            {(
              <>
                <ScatterPlotList />
              </>
            )}
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="grid md:grid-cols-12 gap-4 md:gap-8 xl:gap-20 md:items-center px-6 py-2">
        <div className="col-span-5">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {data.graph.name}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            {data.graph.description}
          </p>
        </div>
        {/* Whether what you just claimed has reached this view yet. */}
        <div className="col-span-7 flex justify-end">
          <ProjectionBadge projection={data.graph.projection} />
        </div>
      </div>
      <OntologyGraph graph={data.graph} />
    </KraphGraph.ModelPage>
  );
});


export default Page;
