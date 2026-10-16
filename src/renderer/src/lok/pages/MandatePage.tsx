import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LOK_HELP } from "../help";
import { Badge } from "@/core/ui/badge";
import Timestamp from "@/core/ui/timestamp";
import { LokClient, LokMandate, LokUser } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import React from "react";
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

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-sm">{children}</span>
  </div>
);

/**
 * The instances signed in under the mandate: one client per device. lok has
 * no per-client sign-out; revoking the mandate signs them all out.
 */
const MandateClients = ({ mandate }: { mandate: DetailMandateFragment }) => {
  if (mandate.clients.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold tracking-tight">Running as {mandate.grantor.username}</h3>
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
    </section>
  );
};

/**
 * One mandate: an agent app (a deployer) or the holder of its key may sign
 * the pinned app in as the grantor, within the scopes approved here.
 */
export const MandatePage = asDetailQueryRoute(useGetMandateQuery, ({ data }) => {
  const mandate = data.mandate;
  const subject = mandateSubject(mandate);
  const status = mandateStatus(mandate);
  const scopes = mandateScopes(mandate);
  const holder = mandateHolder(mandate);

  return (
    <LokMandate.ModelPage help={LOK_HELP.mandate} object={mandate} title={subject.identifier}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{subject.identifier}</h1>
            {subject.version && (
              <Badge variant="secondary" className="rounded-full font-mono">
                v{subject.version}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "rounded-full",
                status === "live" && "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
              )}
            >
              {MANDATE_STATUS_LABEL[status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {status === "revoked"
              ? "Withdrawn. Every instance started under it was signed out."
              : `Signs this app in as ${mandate.grantor.username}, started by ${holder}.`}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label="Granted by">
            <LokUser.DetailLink object={mandate.grantor} className="hover:text-primary">
              {mandate.grantor.username}
            </LokUser.DetailLink>
          </Fact>
          <Fact label="Signed in by">
            <span className="font-mono text-xs">{holder}</span>
          </Fact>
          {mandate.label && <Fact label="Label">{mandate.label}</Fact>}
          {mandate.subject.deviceId && (
            <Fact label="Pinned to device">
              <span className="font-mono text-xs">{mandate.subject.deviceId}</span>
            </Fact>
          )}
          {mandate.agentDevice && (
            <Fact label="Only on device">{mandate.agentDevice.name ?? mandate.agentDevice.deviceId}</Fact>
          )}
          {mandate.agentUser && <Fact label="Only for operator">{mandate.agentUser.username}</Fact>}
          <Fact label="Instances">
            {mandate.clients.length}
            {mandate.maxClients != null ? ` of at most ${mandate.maxClients}` : ""}
          </Fact>
          <Fact label="Granted">
            <Timestamp date={mandate.createdAt} relative />
          </Fact>
          {mandate.expiresAt && (
            <Fact label={status === "expired" ? "Expired" : "Expires"}>
              <Timestamp date={mandate.expiresAt} relative />
            </Fact>
          )}
          {mandate.revokedAt && (
            <Fact label="Revoked">
              <Timestamp date={mandate.revokedAt} relative />
            </Fact>
          )}
          <Fact label="Hub">{mandate.hub.name}</Fact>
        </div>

        {scopes.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-base font-semibold tracking-tight">Allowed to</h3>
            <div className="flex flex-wrap gap-1.5">
              {scopes.map((scope) => (
                <Badge key={scope} variant="secondary" className="font-mono text-xs">
                  {scope}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <MandateClients mandate={mandate} />
      </div>
    </LokMandate.ModelPage>
  );
});

export default MandatePage;
