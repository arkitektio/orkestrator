import { PageSections } from "@/core/layout/PageSections";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { InfoList } from "@/core/ui/info-list";
import {
  KabinetApp,
  KabinetBackend,
  KabinetDeployment,
  KabinetFlavour,
  KabinetRelease,
} from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { useGetDeploymentQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import ApprovalCard from "../components/cards/ApprovalCard";
import { DetailSection } from "../components/DetailSection";
import { RevokeApprovalButton } from "../components/RevokeApprovalButton";
import { KABINET_HELP } from "../help";
import { POD_STATUS_DOT, podStatusLabel } from "../lib/podStatus";

const LINK = "hover:underline";

/**
 * One deployment: which build of which app is installed on which backend, how
 * it is doing, and the approval it acts under. The body is who it runs as; the
 * app, release, flavour and backend are the Info rail's.
 */
export const DeploymentPage = asDetailQueryRoute(useGetDeploymentQuery, ({ data }) => {
  const deployment = data.deployment;
  const release = deployment.flavour.release;
  const app = releaseIdentity({ ...release, flavours: [deployment.flavour] });

  return (
    <KabinetDeployment.ModelPage
      object={deployment}
      title={deployment.name}
      help={KABINET_HELP.deployment}
      pageActions={
        // Other modules' actions on a deployment.
        <PageSections placement="actions" identifier="@kabinet/deployment" object={{ id: deployment.id }} />
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Status",
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", POD_STATUS_DOT[deployment.status])} />
                  {podStatusLabel(deployment.status)}
                </span>,
              ],
              [
                "App",
                release.app.id ? (
                  <KabinetApp.DetailLink object={{ id: release.app.id }} className={cn(LINK, "font-mono")}>
                    {release.app.identifier}
                  </KabinetApp.DetailLink>
                ) : (
                  <span className="font-mono">{release.app.identifier}</span>
                ),
              ],
              [
                "Release",
                <KabinetRelease.DetailLink object={release} className={cn(LINK, "font-mono")}>
                  v{release.version}
                </KabinetRelease.DetailLink>,
              ],
              [
                "Flavour",
                <KabinetFlavour.DetailLink object={deployment.flavour} className={LINK}>
                  {deployment.flavour.name}
                </KabinetFlavour.DetailLink>,
              ],
              [
                "Backend",
                <span>
                  <KabinetBackend.DetailLink object={deployment.backend} className={LINK}>
                    {deployment.backend.name}
                  </KabinetBackend.DetailLink>
                  <span className="text-muted-foreground"> · {deployment.backend.kind}</span>
                </span>,
              ],
              ["Local ID", <span className="break-all font-mono text-xs">{deployment.localId}</span>],
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
              <span className={cn("size-1.5 rounded-full", POD_STATUS_DOT[deployment.status])} />
              {podStatusLabel(deployment.status)} · {deployment.flavour.name} on {deployment.backend.name}
            </p>
          </div>
        </header>

        <DetailSection
          title="Runs as"
          action={
            deployment.approval && <RevokeApprovalButton approval={deployment.approval} label="Revoke mandate" />
          }
        >
          {deployment.approval ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3">
              <ApprovalCard item={deployment.approval} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This deployment was not installed under a release approval.
            </p>
          )}
        </DetailSection>

        {/* Other modules on a deployment. */}
        <PageSections placement="main" identifier="@kabinet/deployment" object={{ id: deployment.id }} />
      </div>
    </KabinetDeployment.ModelPage>
  );
});

export default DeploymentPage;
