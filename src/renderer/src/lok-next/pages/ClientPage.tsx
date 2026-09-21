import { useDialog } from "@/app/dialog";
import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageAction } from "@/components/ui/page-action";
import { Image } from "@/components/ui/image";
import { Separator } from "@/components/ui/separator";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokClient, LokDevice, RekuestTask } from "@/linkers";
import {
  TaskEventKind,
  PostmanTaskFragment,
  useListTasksDetailsQuery,
} from "@/rekuest/api/graphql";
import {
  AlertTriangle,
  Bug,
  ExternalLink,
  Server,
  User,
} from "lucide-react";
import { useDetailClientQuery } from "../api/graphql";
import { clientAppIdentifier } from "../lib/clientLabels";

const FailedTasks = ({ clientId }: { clientId: string }) => {
  const { openDialog } = useDialog();

  const { data } = useListTasksDetailsQuery({
    variables: {
      filter: {
        clientId: clientId,
        state: [TaskEventKind.Critical],
      },
    },
  });

  if (!data?.tasks?.length) return null;

  const handleReportBug = (task: PostmanTaskFragment) => {
    openDialog("reportbug", {
      taskId: task.id,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-red-500 font-medium">
        <AlertTriangle className="h-5 w-5" />
        <h3>Critical Failures</h3>
      </div>
      <div className="border rounded-md divide-y">
        {data.tasks.map((ex, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <RekuestTask.DetailLink object={{id: ex.id}} className="flex flex-col gap-1">
              <div className="font-medium flex items-center gap-2">
                {ex.action.name}
                <Badge variant="destructive" className="text-[10px] h-5">
                  CRITICAL
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {ex.id}
              </div>
            </RekuestTask.DetailLink>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => handleReportBug(ex)}
            >
              <Bug className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default asDetailQueryRoute(useDetailClientQuery, ({ data }) => {
  const resolve = useResolve();
  const { openDialog } = useDialog();

  const handleReportClientBug = () => {
    openDialog("reportclientbug", {
      client: data.client,
      issueUrl: data.client.issueUrl || undefined,
    });
  };

  const pressLink = (url: string) => {
    window.api.openWebbrowser(url);
  };

  return (
    <LokClient.ModelPage
      object={data.client}
      pageActions={
        <>
          <PageAction
            priority={-10}
            collapse="icon"
            icon={<Bug className="h-4 w-4" />}
            size="sm"
            onClick={handleReportClientBug}
          >
            Report Bug
          </PageAction>
          {data.client.publicSources?.map((source, index) => (
            <PageAction
              key={index}
              collapse="icon"
              icon={<ExternalLink className="h-4 w-4" />}
              menuLabel={source.kind}
              onClick={() => pressLink(source.url)}
              size="sm"
            >
              {source.kind}
            </PageAction>
          ))}
        </>
      }
      title={data?.client && clientAppIdentifier(data.client)}
    >
      <div className="space-y-8 p-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="flex gap-6">
            {data.client.logo?.presignedUrl && (
              <div className="h-24 w-24 shrink-0 rounded-xl overflow-hidden border bg-muted shadow-sm">
                <Image
                  src={resolve(data?.client?.logo.presignedUrl)}
                  className="object-contain w-full h-full"
                  alt="Client Logo"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight">
                  {clientAppIdentifier(data.client)}
                </h1>
                {data.client.release && (
                  <Badge variant="secondary" className="text-sm px-2 py-0.5">
                    v{data.client.release.version}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>@{data.client.user?.username || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  {data.client.node ? (
                    <LokDevice.DetailLink
                      object={data.client.node}
                      className="hover:underline font-medium"
                    >
                      {data.client.node.name}
                    </LokDevice.DetailLink>
                  ) : (
                    "Unassigned"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                    {data.client.clientId}
                  </span>
                </div>
              </div>


            </div>
          </div>
        </div>

        <Separator />


        {/* Failed Tasks Section */}
        <FailedTasks clientId={data.client.clientId} />
      </div>
    </LokClient.ModelPage>
  );
});
