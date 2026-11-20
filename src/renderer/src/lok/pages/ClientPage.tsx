import { useDialog } from "@/core/dialogs/registry";
import { LOK_HELP } from "../help";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { PageAction } from "@/core/ui/page-action";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { PageSections } from "@/core/layout/PageSections";
import { LokClient, LokDevice, LokRelease } from "@/core/linkers";
import { Bug, ExternalLink, Plug } from "lucide-react";
import { useDetailClientQuery } from "../api/graphql";
import { clientAppIdentifier } from "../lib/clientLabels";
import { BugReportTable } from "../components/bugreports/BugReportTable";
import { LogoOrIcon } from "../components/DetailParts";
import { deviceLabel } from "../components/UserAvatar";

/** `RELYING_PARTY` → "Relying party". */
const kindLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
import { ADMIN_ROLE, RoleGuard } from "@/core/connection/roles";

/**
 * One client: an installation of an app, signed in for one operator on one
 * device. Its app and version in the header, who runs it where on the line
 * under it; its ids and settings in the Info rail; what other modules show
 * about it (rekuest: its failed tasks) and, for admins, its bug reports in
 * the body.
 */
export default asDetailQueryRoute(useDetailClientQuery, ({ data }) => {
  const client = data.client;
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
      help={LOK_HELP.client}
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
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["Name", client.name],
              [
                "Release",
                client.release && (
                  <LokRelease.DetailLink object={client.release} className="font-mono hover:underline">
                    {client.release.version}
                  </LokRelease.DetailLink>
                ),
              ],
              ["Operator", client.user ? `@${client.user.username}` : "Unknown"],
              [
                "Device",
                client.node ? (
                  <LokDevice.DetailLink object={client.node} className="hover:underline">
                    {deviceLabel(client.node)}
                  </LokDevice.DetailLink>
                ) : (
                  "Unassigned"
                ),
              ],
              ["Kind", kindLabel(client.kind)],
              ["Role", kindLabel(client.role)],
              ["Public", client.public ? "Yes" : "No"],
              [
                "Client ID",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs">{client.clientId}</span>
                  <CopyButton value={client.clientId} title="Copy client ID" />
                </span>,
              ],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex w-full flex-col gap-8 p-3">
        <ModuleHomeHeader
          moduleKey="lok"
          icon={<LogoOrIcon src={client.logo?.presignedUrl} fallback={<Plug />} />}
          title={
            <span className="flex flex-wrap items-baseline gap-2">
              {clientAppIdentifier(client)}
              {client.release && (
                <span className="font-mono text-lg font-normal text-muted-foreground">{client.release.version}</span>
              )}
            </span>
          }
          description={[
            client.user ? `by @${client.user.username}` : "operator unknown",
            client.node ? `on ${deviceLabel(client.node)}` : "on no device",
            kindLabel(client.kind),
          ].join(" · ")}
        />

        {/* What other modules show about a client (rekuest: its failed tasks),
            given the client's OAuth id to filter by. */}
        <PageSections
          placement="main"
          identifier="@lok/client"
          object={{ id: client.id, clientId: client.clientId }}
        />

        {/* What people reported from inside this installation. */}
        <RoleGuard require={ADMIN_ROLE}>
          <BugReportTable title="Bug reports" filters={{ client: client.id }} hideWhenEmpty />
        </RoleGuard>
      </div>
    </LokClient.ModelPage>
  );
});
