import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LOK_HELP } from "../help";
import { Badge } from "@/core/ui/badge";
import Timestamp from "@/core/ui/timestamp";
import { LokClient, LokMandate, LokUser } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { KeyRound } from "lucide-react";
import { DetailSection } from "../components/DetailParts";
import {
  DetailMandateFragment,
  useGetMandateQuery,
} from "../api/graphql";
import {
  MANDATE_STATUS_LABEL,
  mandateHolder,
  mandateScopes,
  mandateStatus,
  mandateSubject,
} from "../lib/mandateLabels";

/**
 * The instances signed in under the mandate: one client per device. lok has
 * no per-client sign-out; revoking the mandate signs them all out.
 */
const MandateClients = ({ mandate }: { mandate: DetailMandateFragment }) => {
  if (mandate.clients.length === 0) return null;

  return (
    <DetailSection title={`Running as ${mandate.grantor.username}`} count={mandate.clients.length}>
      <div className="flex flex-col divide-y rounded-md border">
        {mandate.clients.map((client) => (
          <div key={client.id} className="min-w-0 px-3 py-2">
            <LokClient.DetailLink object={client} className="block truncate text-sm hover:text-primary">
              {client.name}
            </LokClient.DetailLink>
            <p className="truncate font-mono text-xs text-muted-foreground">{client.clientId}</p>
          </div>
        ))}
      </div>
    </DetailSection>
  );
};

/**
 * One mandate: an agent app (a deployer) or the holder of its key may sign
 * the pinned app in as the grantor, within the scopes approved here. What it
 * allows and who runs under it are the body; its facts are the Info rail's.
 */
export const MandatePage = asDetailQueryRoute(useGetMandateQuery, ({ data }) => {
  const mandate = data.mandate;
  const subject = mandateSubject(mandate);
  const status = mandateStatus(mandate);
  const scopes = mandateScopes(mandate);
  const holder = mandateHolder(mandate);

  return (
    <LokMandate.ModelPage
      help={LOK_HELP.mandate}
      object={mandate}
      title={subject.identifier}
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["Status", MANDATE_STATUS_LABEL[status]],
              [
                "Granted by",
                <LokUser.DetailLink object={mandate.grantor} className="hover:underline">
                  {mandate.grantor.username}
                </LokUser.DetailLink>,
              ],
              ["Signed in by", <span className="break-all font-mono text-xs">{holder}</span>],
              ["Label", mandate.label],
              ["Pinned to device", mandate.subject.deviceId && <span className="break-all font-mono text-xs">{mandate.subject.deviceId}</span>],
              ["Only on device", mandate.agentDevice && (mandate.agentDevice.name ?? mandate.agentDevice.deviceId)],
              ["Only for operator", mandate.agentUser?.username],
              [
                "Instances",
                `${mandate.clientCount}${mandate.maxClients != null ? ` of at most ${mandate.maxClients}` : ""}`,
              ],
              ["Granted", <Timestamp date={mandate.createdAt} relative />],
              [status === "expired" ? "Expired" : "Expires", mandate.expiresAt && <Timestamp date={mandate.expiresAt} relative />],
              ["Revoked", mandate.revokedAt && <Timestamp date={mandate.revokedAt} relative />],
              ["Hub", mandate.hub.name],
              [
                "Mandate ID",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs">{mandate.id}</span>
                  <CopyButton value={mandate.id} title="Copy mandate ID" />
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
          icon={<KeyRound />}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {subject.identifier}
              {subject.version && (
                <Badge variant="secondary" className="rounded-full font-mono">
                  v{subject.version}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("rounded-full", status === "live" && "border-success/40 text-success")}
              >
                {MANDATE_STATUS_LABEL[status]}
              </Badge>
            </span>
          }
          description={
            status === "revoked"
              ? "Withdrawn. Every instance started under it was signed out."
              : `Signs this app in as ${mandate.grantor.username}, started by ${holder}.`
          }
        />

        <DetailSection title="Allowed to" count={scopes.length}>
          <div className="flex flex-wrap gap-1.5">
            {scopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="font-mono text-xs">
                {scope}
              </Badge>
            ))}
          </div>
        </DetailSection>

        <MandateClients mandate={mandate} />
      </div>
    </LokMandate.ModelPage>
  );
});

export default MandatePage;
