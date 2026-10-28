import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Badge } from "@/core/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/ui/card";
import { PageSections } from "@/core/layout/PageSections";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { KabinetApproval, KabinetDeployment, KabinetFlavour, KabinetPod, KabinetRelease } from "@/core/linkers";
import { useGetPodQuery } from "../api/graphql";
import ResourceCard from "../components/cards/ResourceCard";
import { APPROVAL_STATUS_LABEL, approvalStatus } from "../lib/approvals";
import { KABINET_HELP } from "../help";

const PodPage = asDetailQueryRoute(useGetPodQuery, ({ data }) => {
  const pod = data.pod;

  return (
    <KabinetPod.ModelPage
      title={pod.backend.name}
      object={pod}
      help={KABINET_HELP.pod}
      pageActions={
        // Other modules' actions on a pod (rekuest: its agents' pod actions).
        <PageSections
          placement="actions"
          identifier="@kabinet/pod"
          object={{ id: pod.id, clientId: pod.backend.clientId, backendName: pod.backend.name }}
        />
      }
    >
      <div className="space-y-4 p-3">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4 rounded-2xl border bg-gradient-to-br from-background via-background to-muted/40 p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <span>{pod.deployment.flavour.release.app.identifier}</span>
                <span>•</span>
                <span>{pod.deployment.flavour.release.version}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {pod.backend.name}
              </h1>
              <CardDescription className="text-sm">
                Live pod for {pod.deployment.flavour.release.app.identifier} on{" "}
                {pod.backend.name}. The log stream and deployment details below
                summarise the current runtime state.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {pod.deployment.flavour.release.app.identifier}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {pod.deployment.flavour.release.version}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {pod.status || "Unknown status"}
              </Badge>
            </div>
          </div>

          <Card className="border-dashed bg-muted/20">
            <CardHeader>
              <CardTitle className="text-lg">Quick Facts</CardTitle>
              <CardDescription>Current pod runtime details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground">Backend</div>
                <div className="font-medium break-all">{pod.backend.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Deployment</div>
                <KabinetDeployment.DetailLink
                  object={pod.deployment}
                  className="font-medium break-all hover:text-primary"
                >
                  {pod.deployment.name}
                </KabinetDeployment.DetailLink>
              </div>
              <div>
                <div className="text-muted-foreground">Flavour</div>
                <KabinetFlavour.DetailLink
                  object={pod.deployment.flavour}
                  className="font-medium break-all hover:text-primary"
                >
                  {pod.deployment.flavour.name}
                </KabinetFlavour.DetailLink>
              </div>
              <div>
                <div className="text-muted-foreground">Release</div>
                <KabinetRelease.DetailLink
                  object={pod.deployment.flavour.release}
                  className="font-medium break-all hover:text-primary"
                >
                  v{pod.deployment.flavour.release.version}
                </KabinetRelease.DetailLink>
              </div>
              {pod.deployment.approval && (
                <div>
                  <div className="text-muted-foreground">Runs as</div>
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    <StructureDisplay
                      identifier="@lok/user"
                      id={pod.deployment.approval.approver.sub}
                      variant="chip"
                    />
                    <KabinetApproval.DetailLink
                      object={pod.deployment.approval}
                      className="text-xs font-normal text-muted-foreground hover:text-primary"
                    >
                      approval {APPROVAL_STATUS_LABEL[approvalStatus(pod.deployment.approval)].toLowerCase()}
                    </KabinetApproval.DetailLink>
                  </div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Resource</div>
                <div className="font-medium break-all">
                  {pod.resource?.name || "No resource attached"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Latest Logs</CardTitle>
              <CardDescription>
                The newest log dump emitted by this pod.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[28rem] overflow-auto rounded-2xl bg-muted/30 p-4 text-xs leading-6 whitespace-pre-wrap break-words">
                {pod.latestLogDump?.logs || "No logs available yet."}
              </pre>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {pod.resource && (
              <Card>
                <CardHeader>
                  <CardTitle>Running On</CardTitle>
                  <CardDescription>
                    The resource currently hosting this pod.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                  <ResourceCard item={pod.resource} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Deployment Path</CardTitle>
                <CardDescription>
                  The release and flavour stack used for this pod.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground">App</div>
                  <div className="font-medium break-all">
                    {pod.deployment.flavour.release.app.identifier}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Release</div>
                  <div className="font-medium break-all">
                    {pod.deployment.flavour.release.version}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Backend</div>
                  <div className="font-medium break-all">{pod.backend.name}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </KabinetPod.ModelPage>
  );
});

export default PodPage;
