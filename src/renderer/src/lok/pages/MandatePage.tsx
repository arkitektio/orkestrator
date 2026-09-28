import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { toast } from "@/core/notify";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import Timestamp from "@/core/ui/timestamp";
import { LokClient, LokMandate, LokUser } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { LogOut } from "lucide-react";
import React from "react";
import {
  DetailMandateFragment,
  GetMandateDocument,
  useGetMandateQuery,
  useReleaseMandateClientMutation,
} from "../api/graphql";
import {
  MANDATE_STATUS_LABEL,
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
 * The instances signed in under the mandate. Signing one out deletes its lok
 * client (`releaseMandateClient`); the deployer can provision a new one while
 * the mandate is live.
 */
const MandateClients = ({ mandate }: { mandate: DetailMandateFragment }) => {
  const [release, { loading }] = useReleaseMandateClientMutation({
    refetchQueries: [{ query: GetMandateDocument, variables: { id: mandate.id } }],
  });

  if (mandate.clients.length === 0) return null;

  const signOut = async (clientId: string) => {
    try {
      await release({ variables: { clientId } });
      toast.success("Signed out");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign the instance out");
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold tracking-tight">Running as {mandate.grantor.username}</h3>
      <div className="flex flex-col divide-y rounded-md border">
        {mandate.clients.map((client) => (
          <div key={client.id} className="group flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <LokClient.DetailLink object={client} className="block truncate text-sm hover:text-primary">
                {client.name}
              </LokClient.DetailLink>
              <p className="truncate font-mono text-xs text-muted-foreground">{client.clientId}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={loading}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => signOut(client.clientId)}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};

/**
 * One mandate: an agent app (a deployer) may start one exact app version
 * signed in as the grantor, within the scopes approved here.
 */
export const MandatePage = asDetailQueryRoute(useGetMandateQuery, ({ data }) => {
  const mandate = data.mandate;
  const subject = mandateSubject(mandate);
  const status = mandateStatus(mandate);
  const scopes = mandateScopes(mandate);

  return (
    <LokMandate.ModelPage object={mandate} title={subject.identifier}>
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
              : `${mandate.agentIdentifier} may start this app signed in as ${mandate.grantor.username}.`}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label="Granted by">
            <LokUser.DetailLink object={mandate.grantor} className="hover:text-primary">
              {mandate.grantor.username}
            </LokUser.DetailLink>
          </Fact>
          <Fact label="Started by">
            <span className="font-mono text-xs">{mandate.agentIdentifier}</span>
          </Fact>
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
