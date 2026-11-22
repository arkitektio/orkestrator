import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LOK_HELP } from "../help";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { LokApp } from "@/core/linkers";
import { AppWindow } from "lucide-react";
import { useDetailAppQuery } from "../api/graphql";
import ReleaseCard from "../components/cards/ReleaseCard";
import { BugReportTable } from "../components/bugreports/BugReportTable";
import { DetailGrid, DetailSection, LogoOrIcon } from "../components/DetailParts";
import { ADMIN_ROLE, RoleGuard } from "@/core/connection/roles";

/**
 * One app: its identifier and logo in the header, its releases in the body,
 * and (for admins) what people reported from it. Its ids are the Info rail's.
 */
export const AppPage = asDetailQueryRoute(useDetailAppQuery, ({ data }) => {
  const app = data.app;
  const latest = app.releases.at(0)?.version;

  return (
    <LokApp.ModelPage
      help={LOK_HELP.app}
      object={app}
      pageActions={<LokApp.Actions object={app} />}
      title={app.identifier}
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Identifier",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs">{app.identifier}</span>
                  <CopyButton value={app.identifier} title="Copy identifier" />
                </span>,
              ],
              ["Releases", app.releaseCount],
              ["App ID", <span className="break-all font-mono text-xs">{app.id}</span>],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<LogoOrIcon src={app.logo?.presignedUrl} fallback={<AppWindow />} />}
          title={app.identifier}
          description={[
            `${app.releaseCount} ${app.releaseCount === 1 ? "release" : "releases"}`,
            ...(latest ? [`latest ${latest}`] : []),
          ].join(" · ")}
        />

        <DetailSection title="Releases" count={app.releaseCount}>
          <DetailGrid>
            {app.releases.map((release) => (
              <ReleaseCard key={release.id} item={release} />
            ))}
          </DetailGrid>
        </DetailSection>

        <RoleGuard require={ADMIN_ROLE}>
          <BugReportTable title="Bug reports" filters={{ app: app.id }} hideWhenEmpty />
        </RoleGuard>
      </div>
    </LokApp.ModelPage>
  );
});

export default AppPage;
