import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import { FlussFlow, FlussWorkspace } from "@/linkers";
import {
  useUpdateWorkspaceMutation,
  useWorkspaceQuery,
  WorkspaceCarouselDocument,
  WorkspacesDocument,
} from "@/reaktion/api/graphql";
import { EditFlow } from "@/reaktion/edit/EditFlow";

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
                    <FlussFlow.DetailLink object={fl}>
                      {fl.title}
                    </FlussFlow.DetailLink>
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
          flow={data?.workspace.latestFlow}
          onSave={(e) => {
            console.log("saving flow", e);
            saveFlow({
              variables: {
                id: data.workspace.id,
                graph: e,
              },
            })
              .then((e) => {
                console.log(e);
              })
              .catch((e) => {
                console.log(e);
              });
          }}
        />
      )}
    </FlussWorkspace.ModelPage>
  );
});

export default Page;
