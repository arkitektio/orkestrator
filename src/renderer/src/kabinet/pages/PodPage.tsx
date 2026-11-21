import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { PageSections } from "@/core/layout/PageSections";
import { Sidebars } from "@/core/layout/Sidebars";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { InfoList } from "@/core/ui/info-list";
import {
  KabinetApproval,
  KabinetBackend,
  KabinetDeployment,
  KabinetFlavour,
  KabinetPod,
  KabinetRelease,
  KabinetResource,
} from "@/core/linkers";
import { cn } from "@/core/util/utils";
import type React from "react";
import { useGetPodQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import { DetailSection, FactGrid } from "../components/DetailSection";
import { IconForBackendKind } from "../components/IconForBackendKind";
import { PodLog } from "../components/PodLog";
import { APPROVAL_STATUS_LABEL, approvalStatus } from "../lib/approvals";
import { POD_STATUS_DOT, podStatusLabel } from "../lib/podStatus";
import { KABINET_HELP } from "../help";

const LINK = "hover:underline";

/**
 * A pod: one running copy of an app. The body says where it runs, what it was
 * started from and who it acts as, then what it said (its logs, which its
 * backend reads again on "Refresh"); the Info rail repeats the facts and adds
 * the ids.
 */
const PodPage = asDetailQueryRoute(useGetPodQuery, ({ data }) => {
  const pod = data.pod;
  const { deployment } = pod;
  const release = deployment.flavour.release;
  const app = releaseIdentity(release);
  const approval = deployment.approval;

  return (
    <KabinetPod.ModelPage
      title={`${app.name} on ${pod.backend.name}`}
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
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Status",
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", POD_STATUS_DOT[pod.status])} />
                  {podStatusLabel(pod.status)}
                </span>,
              ],
              [
                "Backend",
                <KabinetBackend.DetailLink object={pod.backend} className={LINK}>
                  {pod.backend.name}
                </KabinetBackend.DetailLink>,
              ],
              [
                "Resource",
                pod.resource && (
                  <KabinetResource.DetailLink object={pod.resource} className={LINK}>
                    {pod.resource.name}
                  </KabinetResource.DetailLink>
                ),
              ],
              [
                "Deployment",
                <KabinetDeployment.DetailLink object={deployment} className={cn(LINK, "break-all")}>
                  {deployment.name}
                </KabinetDeployment.DetailLink>,
              ],
              [
                "Release",
                <KabinetRelease.DetailLink object={release} className={cn(LINK, "font-mono")}>
                  {release.app.identifier} v{release.version}
                </KabinetRelease.DetailLink>,
              ],
              [
                "Flavour",
                <KabinetFlavour.DetailLink object={deployment.flavour} className={LINK}>
                  {deployment.flavour.name}
                </KabinetFlavour.DetailLink>,
              ],
              [
                "Runs as",
                deployment.approval && (
                  <span className="flex flex-col items-start gap-0.5">
                    <StructureDisplay
                      identifier="@lok/user"
                      id={deployment.approval.approver.sub}
                      variant="inline"
                    />
                    <KabinetApproval.DetailLink
                      object={deployment.approval}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      approval {APPROVAL_STATUS_LABEL[approvalStatus(deployment.approval)].toLowerCase()}
                    </KabinetApproval.DetailLink>
                  </span>
                ),
              ],
              ["Pod", <span className="break-all font-mono text-xs">{pod.podId}</span>],
              ["Client", pod.clientId && <span className="break-all font-mono text-xs">{pod.clientId}</span>],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex flex-col gap-6 p-3">
        <header className="flex items-center gap-3">
          <AppIcon app={app} size={40} className="size-10 rounded-xl" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              {app.name}
              <span className="font-mono text-xs font-normal text-muted-foreground">v{release.version}</span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", POD_STATUS_DOT[pod.status])} />
              {podStatusLabel(pod.status)} on {pod.backend.name}
            </p>
          </div>
        </header>

        <DetailSection title="About">
          <FactGrid
            rows={[
              [
                "Status",
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", POD_STATUS_DOT[pod.status])} />
                  {podStatusLabel(pod.status)}
                </span>,
              ],
              [
                "Backend",
                <KabinetBackend.DetailLink object={pod.backend} className={cn(LINK, "flex items-center gap-1.5")}>
                  <IconForBackendKind kind={pod.backend.kind} className="size-3.5 shrink-0" />
                  {pod.backend.name}
                </KabinetBackend.DetailLink>,
              ],
              ...(pod.resource
                ? ([
                    [
                      "Resource",
                      <KabinetResource.DetailLink object={pod.resource} className={LINK}>
                        {pod.resource.name}
                      </KabinetResource.DetailLink>,
                    ],
                  ] as [string, React.ReactNode][])
                : []),
              [
                "Release",
                <KabinetRelease.DetailLink object={release} className={LINK}>
                  {app.name} v{release.version}
                </KabinetRelease.DetailLink>,
              ],
              [
                "Flavour",
                <KabinetFlavour.DetailLink object={deployment.flavour} className={LINK}>
                  {deployment.flavour.name}
                </KabinetFlavour.DetailLink>,
              ],
              [
                "Deployment",
                <KabinetDeployment.DetailLink object={deployment} className={LINK}>
                  {deployment.name}
                </KabinetDeployment.DetailLink>,
              ],
              ...(approval
                ? ([
                    [
                      "Runs as",
                      <span className="flex flex-col items-start gap-0.5">
                        <StructureDisplay identifier="@lok/user" id={approval.approver.sub} variant="inline" />
                        <KabinetApproval.DetailLink
                          object={approval}
                          className="text-xs font-normal text-muted-foreground hover:text-foreground"
                        >
                          approval {APPROVAL_STATUS_LABEL[approvalStatus(approval)].toLowerCase()}
                        </KabinetApproval.DetailLink>
                      </span>,
                    ],
                  ] as [string, React.ReactNode][])
                : []),
              [
                "Connected by",
                <StructureDisplay identifier="@lok/user" id={pod.backend.user.sub} variant="inline" />,
              ],
            ]}
          />
        </DetailSection>

        <PodLog pod={pod.id} backendName={pod.backend.name} dump={pod.latestLogDump} />

        {/* Other modules on a pod. */}
        <PageSections placement="main" identifier="@kabinet/pod" object={{ id: pod.id }} />
      </div>
    </KabinetPod.ModelPage>
  );
});

export default PodPage;
