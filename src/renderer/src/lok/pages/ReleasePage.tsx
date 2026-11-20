import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LOK_HELP } from "../help";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { InfoList } from "@/core/ui/info-list";
import { LokApp } from "@/core/linkers";
import { Tag } from "lucide-react";
import { useDetailReleaseQuery } from "../api/graphql";
import ClientCard from "../components/cards/ClientCard";
import { BugReportTable } from "../components/bugreports/BugReportTable";
import { DetailGrid, DetailSection, LogoOrIcon } from "../components/DetailParts";
import { ADMIN_ROLE, RoleGuard } from "@/core/connection/roles";

/**
 * One release of an app: its app and version in the header, the clients
 * (installations) running it in the body, and (for admins) what people
 * reported from it. Its ids are the Info rail's.
 */
export const ReleasePage = asDetailQueryRoute(useDetailReleaseQuery, ({ data }) => {
  const release = data.release;
  const logo = release.logo?.presignedUrl ?? release.app.logo?.presignedUrl;

  return (
    <LokApp.ModelPage
      help={LOK_HELP.release}
      object={release}
      actions={<LokApp.Actions object={release} />}
      title={`${release.app.identifier} ${release.version}`}
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "App",
                <LokApp.DetailLink object={release.app} className="hover:underline">
                  {release.app.identifier}
                </LokApp.DetailLink>,
              ],
              ["Version", <span className="font-mono">{release.version}</span>],
              ["Clients", release.clients.length],
              ["Release ID", <span className="break-all font-mono text-xs">{release.id}</span>],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<LogoOrIcon src={logo} fallback={<Tag />} />}
          title={
            <span className="flex flex-wrap items-baseline gap-2">
              {release.app.identifier}
              <span className="font-mono text-lg font-normal text-muted-foreground">{release.version}</span>
            </span>
          }
          description={`${release.clients.length} ${release.clients.length === 1 ? "client runs" : "clients run"} this release`}
        />

        <DetailSection title="Clients" count={release.clients.length}>
          <DetailGrid>
            {release.clients.map((client) => (
              <ClientCard key={client.id} item={client} />
            ))}
          </DetailGrid>
        </DetailSection>

        <RoleGuard require={ADMIN_ROLE}>
          <BugReportTable title="Bug reports" filters={{ release: release.id }} hideWhenEmpty />
        </RoleGuard>
      </div>
    </LokApp.ModelPage>
  );
});

export default ReleasePage;
