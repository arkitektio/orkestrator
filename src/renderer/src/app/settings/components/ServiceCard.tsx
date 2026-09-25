import { Card, CardContent } from "@/core/ui/card";
import {
  CLIENT_SIDE_LABEL,
  HUB_SIDE_LABEL,
  HUB_VERDICT_TEXT,
  clientSideFor,
  compareService,
  type HubHealthFacts,
} from "@/core/connection/arkitekt/doctor/hubHealth";
import { aliasToHttpPath } from "@/core/connection/arkitekt/alias/helpers";
import { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import { serviceRoute, type ServiceRoute } from "@/core/connection/mesh/route";
import { cn } from "@/core/util/utils";
import { formatDistanceToNow } from "date-fns";
import { Globe, Lock, LockOpen, Network, Server } from "lucide-react";
import React from "react";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { StatusLabel, type Tone } from "./StatusLabel";

const NETWORK_LABEL: Record<Extract<ServiceRoute, { kind: "direct" }>["network"], string> = {
  public: "over the internet",
  local: "on the local network",
  "this-computer": "on this computer",
  "mesh-looking": "— looks like a mesh address, but no running mesh routes it",
};

/** One line on how requests reach the service: through the mesh, or straight there. */
const RouteLine = ({ route, ssl }: { route: ServiceRoute; ssl: boolean }) => {
  if (route.kind === "mesh") {
    const { peer } = route;
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <Network className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="min-w-0 truncate">
          Through the mesh <span className="font-medium text-foreground">{route.meshLabel}</span>
          {peer && (
            <>
              {" · "}
              <span className="font-mono">{peer.name}</span>
              {!peer.online
                ? " (offline)"
                : peer.path?.kind === "relay"
                  ? ` · relayed via ${peer.path.region}`
                  : peer.path?.kind === "direct"
                    ? " · direct tunnel"
                    : ""}
            </>
          )}
        </span>
      </span>
    );
  }
  const suspicious = route.network === "mesh-looking";
  const Encryption = ssl ? Lock : LockOpen;
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", suspicious && "text-amber-600 dark:text-amber-400")}>
      <Globe className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">Direct {NETWORK_LABEL[route.network]}</span>
      {!suspicious && (
        <span className="flex shrink-0 items-center gap-1">
          · <Encryption className="size-3" /> {ssl ? "HTTPS" : "unencrypted HTTP"}
        </span>
      )}
    </span>
  );
};

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <dt className="text-muted-foreground/70">{label}</dt>
    <dd className="min-w-0 text-muted-foreground">{children}</dd>
  </>
);

/** The hub's word on this service next to this computer's, when the hub reports. */
const HubLine = ({ service, hub }: { service: ServiceRuntimeState; hub: HubHealthFacts }) => {
  const client = clientSideFor(service.status);
  if (!client) return null;
  const comparison = compareService(hub, service.key, client);
  if (comparison.hub === "unreported") return null;

  const mismatch = comparison.verdict === "path-broken" || comparison.verdict === "stale-report";
  const note =
    comparison.verdict === "agree-ok" ? "" : [HUB_VERDICT_TEXT[comparison.verdict], comparison.reason].filter(Boolean).join(" ");

  return (
    <div className={cn("text-xs text-muted-foreground", mismatch && "text-amber-600 dark:text-amber-400")}>
      <div>
        Hub: {HUB_SIDE_LABEL[comparison.hub]} · This computer: {CLIENT_SIDE_LABEL[comparison.client]}
      </div>
      {note && <div className="mt-0.5">{note}</div>}
    </div>
  );
};

/** What the service's state means, as one status. */
const statusOf = (service: ServiceRuntimeState): { label: string; tone: Tone; pulse?: boolean } => {
  switch (service.status) {
    case "ready":
      return service.revalidating
        ? { label: "Reachable · checking", tone: "good", pulse: true }
        : { label: "Reachable", tone: "good" };
    case "checking":
    case "configured":
      return { label: "Checking", tone: "warn", pulse: true };
    case "invalid":
      return { label: "Unreachable", tone: "bad" };
    default:
      return { label: "Not configured", tone: "muted" };
  }
};

/** One service: whether it answers, where, and how requests get there. */
export const ServiceCard: React.FC<{
  service: ServiceRuntimeState;
  /** The hub's own report, when there is a lok client and the hub reports. */
  hub?: HubHealthFacts;
  /** The live mesh status, to say whether this service is reached through it. */
  mesh?: MeshStatusPayload;
}> = ({ service, hub, mesh }) => {
  const status = statusOf(service);
  const alias = service.alias;
  const aliases = service.instance?.aliases ?? [];
  const aliasIndex = alias ? aliases.findIndex((candidate) => candidate.id === alias.id) : -1;
  const route = alias ? serviceRoute(alias.host, mesh) : undefined;
  const description = typeof service.definition.description === "string" ? service.definition.description : undefined;

  return (
    <Card className={cn("gap-0 py-0", service.status === "invalid" && "border-destructive/40")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Server className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{service.key}</span>
              <StatusLabel tone={status.tone} pulse={status.pulse}>
                {status.label}
              </StatusLabel>
            </div>
            {description && <div className="truncate text-xs text-muted-foreground">{description}</div>}
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <Fact label="Address">
            {alias ? (
              <>
                <span className="font-mono break-all">{aliasToHttpPath(alias, "")}</span>
                {aliases.length > 1 && aliasIndex >= 0 && (
                  <span className="text-muted-foreground/70"> · alias {aliasIndex + 1} of {aliases.length}</span>
                )}
              </>
            ) : aliases.length > 0 ? (
              `none of ${aliases.length} answered`
            ) : (
              "none advertised"
            )}
          </Fact>
          {alias && route && (
            <Fact label="Route">
              <RouteLine route={route} ssl={alias.ssl} />
            </Fact>
          )}
          {service.lastCheckedAt && (
            <Fact label="Checked">{formatDistanceToNow(service.lastCheckedAt, { addSuffix: true })}</Fact>
          )}
          <Fact label="Instance">
            <span className="font-mono">{service.instance?.identifier || "none"}</span>
          </Fact>
        </dl>

        {hub && <HubLine service={service} hub={hub} />}

        {service.errors.length > 0 && (
          <ul className="space-y-0.5 text-xs text-destructive">
            {service.errors.map((error) => (
              <li key={error} className="break-words">
                {error}
              </li>
            ))}
          </ul>
        )}

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Raw configuration
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-muted p-3">
            {JSON.stringify(service.instance, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};
