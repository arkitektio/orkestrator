import { useDialog } from "@/core/app/dialog";
import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Badge } from "@/core/components/ui/badge";
import { PageAction } from "@/core/components/ui/page-action";
import { Image } from "@/core/components/ui/image";
import { Separator } from "@/core/components/ui/separator";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { PageSections } from "@/core/components/layout/PageSections";
import { LokClient, LokDevice } from "@/core/linkers";
import {
  Bug,
  ExternalLink,
  Server,
  User,
} from "lucide-react";
import { useDetailClientQuery } from "../api/graphql";
import { clientAppIdentifier } from "../lib/clientLabels";

export default asDetailQueryRoute(useDetailClientQuery, ({ data }) => {
  const resolve = useLokResolve();
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
        {/* What other modules show about a client (rekuest: its failed tasks),
            given the client's OAuth id to filter by. */}
        <PageSections
          placement="main"
          identifier="@lok/client"
          object={{ id: data.client.id, clientId: data.client.clientId }}
        />
      </div>
    </LokClient.ModelPage>
  );
});
