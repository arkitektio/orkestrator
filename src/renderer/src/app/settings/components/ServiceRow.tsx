import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import { serviceRoute } from "@/core/connection/mesh/route";
import { cn } from "@/core/util/utils";
import { ChevronRight, Server } from "lucide-react";
import { Link } from "react-router-dom";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { connectionProfile, describeService, serviceLink } from "./hubServices";
import { statusOf } from "./ServiceCard";
import { StatusLabel, TONE_TEXT } from "./StatusLabel";

/**
 * One service of the hub in the list: its name, how this computer reaches it, and whether it
 * answers. The whole row opens the service's page.
 */
export const ServiceRow = ({ service, mesh }: { service: ServiceRuntimeState; mesh?: MeshStatusPayload }) => {
  const status = statusOf(service);
  const profile = service.alias ? connectionProfile(serviceRoute(service.alias, mesh), service.alias.ssl) : undefined;
  const description = describeService(service);

  return (
    <Link
      to={serviceLink(service.key)}
      data-testid="service-row"
      className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Server className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{service.definition.name ?? service.key}</span>
          {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
        </div>
        {profile && (
          <div className={cn("truncate text-xs", TONE_TEXT[profile.tone === "good" ? "muted" : profile.tone])} data-testid="service-profile">
            {profile.line}
          </div>
        )}
      </div>
      <StatusLabel tone={status.tone} pulse={status.pulse}>
        {status.label}
      </StatusLabel>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
};
