import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Card } from "@/core/components/ui/card";
import { FlussFlow, FlussWorkspace } from "@/core/linkers";
import {
  useUpdateWorkspaceMutation,
  useWorkspaceQuery,
  WorkspaceCarouselDocument,
  WorkspacesDocument,
} from "@/fluss/api/graphql";
import { EditFlow } from "@/fluss/edit/EditFlow";

export const Page = asDetailQueryRoute(useWorkspaceQuery, ({ data }) => {
  const [saveFlow] = useUpdateWorkspaceMutation({
    refetchQueries: [WorkspacesDocument, WorkspaceCarouselDocument],
  });

  return (
    <FlussWorkspace.ModelPage
      title={data?.workspace?.title}
      object={data.workspace}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <FlussWorkspace.Knowledge object={data.workspace} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Versions">
            <div className="p-4 flex flex-col gap-2">
              {data?.workspace.flows.map((fl) => (
                <FlussFlow.Smart object={fl} key={fl.id}>
                  <Card className="p-4">
                    <FlussFlow.DetailLink object={fl}>{fl.title}</FlussFlow.DetailLink>
                  </Card>
                </FlussFlow.Smart>
              ))}
            </div>
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      {data?.workspace.latestFlow && (
        <EditFlow
          flow={data.workspace.latestFlow}
          onSave={async (graph) => {
            const result = await saveFlow({ variables: { id: data.workspace.id, graph } });
            return result.data?.updateWorkspace.latestFlow ?? undefined;
          }}
        />
      )}
    </FlussWorkspace.ModelPage>
  );
});

export default Page;
