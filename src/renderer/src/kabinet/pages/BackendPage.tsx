import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KabinetBackend, RekuestAgent } from "@/linkers";
import { useAgentsQuery } from "@/rekuest/api/graphql";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { useGetBackendQuery } from "../api/graphql";
import PodCard from "../components/cards/PodCard";
import ResourceCard from "../components/cards/ResourceCard";
import { IconForBackendKind } from "../components/IconForBackendKind";


export const AgentForButton = ({
  backendId,
}: {
  backendId: string;
}) => {

  const { data, error } = useAgentsQuery({
    variables: {
      filters: {
        clientId: backendId
      }
    },
  });

  if (error) {
    return <div>Error loading agent {error.message}</div>;
  }




  return (
    <>
      {data?.agents.map((agent) => (

        <RekuestAgent.DetailLink
          object={agent}
          key={agent.id}
          className="text-sm font-medium hover:underline"
        >
          <Button variant="ghost" size="sm">
            {agent.connected ? (
              <span className="text-green-400">● </span>
            ) : (
              <span className="text-red-400">● </span>
            )}
            {agent.name || "No Agent"}
          </Button>
        </RekuestAgent.DetailLink>
      ))}
    </>
  );
};


export default asDetailQueryRoute(useGetBackendQuery, ({ data }) => {
  return (
    <KabinetBackend.ModelPage
      title={data?.backend?.name}
      object={data?.backend}
      pageActions={
        <>
          <AgentForButton backendId={data?.backend.clientId} />
          <KabinetBackend.ObjectButton alwaysShow object={data.backend} />
        </>
      }
    >
      <div className="p-3">
        <div className="grid grid-cols-6">
          <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center ">
            <div>
              <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                {data?.backend?.name}
              </h1>
              <p className="mt-3 text-xl text-muted-foreground flex flex-row">
                <IconForBackendKind
                  kind={data?.backend.kind}
                  className="h-4 w-4 mr-2 my-auto"
                />
                {data?.backend?.kind}
              </p>
            </div>
          </div>
          <div className="col-span-2">
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-[3/2] items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{1}</span>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <Separator className="mt-8 mb-2" />

        <div className="mt-4 font-light mb-2">Managed Pods</div>
        <div className="grid grid-cols-6 gap-2">
          {data?.backend?.pods.map((pod) => (
            <PodCard key={pod.id} item={pod} />
          ))}
        </div>
        <div className="mt-4 font-light mb-2">Managed Resources</div>
        <div className="grid grid-cols-6 gap-2">
          {data?.backend?.resources.map((re) => (
            <ResourceCard key={re.id} item={re} />
          ))}
        </div>
      </div>
    </KabinetBackend.ModelPage>
  );
});
