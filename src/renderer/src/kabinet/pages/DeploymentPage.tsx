import { PageSections } from "@/core/layout/PageSections";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import {
  KabinetApp,
  KabinetBackend,
  KabinetDeployment,
  KabinetFlavour,
  KabinetRelease,
} from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { cn } from "@/core/util/utils";
import React from "react";
import { useGetDeploymentQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import ApprovalCard from "../components/cards/ApprovalCard";
import { KABINET_HELP } from "../help";
import { POD_STATUS_DOT, podStatusLabel } from "../lib/podStatus";

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="truncate text-sm">{children}</span>
  </div>
);

/**
 * One deployment: which build of which app is installed on which backend, how
 * it is doing, and the approval it acts under.
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
    >
      <div className="flex w-full flex-col gap-4 p-3">
        <header className="flex items-center gap-4">
          <AppIcon app={app} size={56} className="size-14 rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
              <Badge variant="secondary" className="rounded-full font-mono">
                v{release.version}
              </Badge>
              <Badge variant="outline" className="gap-1.5 rounded-full">
                <span className={cn("size-1.5 rounded-full", POD_STATUS_DOT[deployment.status])} />
                {podStatusLabel(deployment.status)}
              </Badge>
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground">{deployment.name}</p>
          </div>
        </header>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3 rounded-xl border p-3">
          <Fact label="App">
            {release.app.id ? (
              <KabinetApp.DetailLink object={{ id: release.app.id }} className="hover:text-primary">
                {release.app.identifier}
              </KabinetApp.DetailLink>
            ) : (
              release.app.identifier
            )}
          </Fact>
          <Fact label="Release">
            <KabinetRelease.DetailLink object={release} className="font-mono hover:text-primary">
              v{release.version}
            </KabinetRelease.DetailLink>
          </Fact>
          <Fact label="Flavour">
            <KabinetFlavour.DetailLink object={deployment.flavour} className="hover:text-primary">
              {deployment.flavour.name}
            </KabinetFlavour.DetailLink>
          </Fact>
          <Fact label="Backend">
            <KabinetBackend.DetailLink object={deployment.backend} className="hover:text-primary">
              {deployment.backend.name}
            </KabinetBackend.DetailLink>
            <span className="text-muted-foreground"> · {deployment.backend.kind}</span>
          </Fact>
          <Fact label="Local ID">
            <span className="font-mono">{deployment.localId}</span>
          </Fact>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Runs as</h2>
          {deployment.approval ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-2">
              <ApprovalCard item={deployment.approval} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This deployment was not installed under a release approval.
            </p>
          )}
        </section>

        {/* Other modules on a deployment. */}
        <PageSections placement="main" identifier="@kabinet/deployment" object={{ id: deployment.id }} />
      </div>
    </KabinetDeployment.ModelPage>
  );
});

export default DeploymentPage;
