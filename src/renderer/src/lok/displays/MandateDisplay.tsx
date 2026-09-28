import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { LokMandate } from "@/core/linkers";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { useGetMandateQuery } from "../api/graphql";
import { MANDATE_STATUS_LABEL, mandateLabel, mandateStatus } from "../lib/mandateLabels";

/**
 * `@lok/mandate`, by id. Kabinet's release approvals point at one
 * (`mandateId`) and show it through this display instead of querying lok.
 */
export const MandateDisplay = ({ id, variant, className }: DisplayWidgetProps) => {
  const { data } = useGetMandateQuery({ variables: { id } });
  const mandate = data?.mandate;
  if (!mandate) return null;

  const status = mandateStatus(mandate);

  if (variant === "inline" || variant === "chip") {
    return (
      <LokMandate.DetailLink object={mandate} className={cn("hover:text-primary", className)}>
        {mandateLabel(mandate)} · {MANDATE_STATUS_LABEL[status]}
      </LokMandate.DetailLink>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <LokMandate.DetailLink object={mandate} className="truncate font-medium hover:text-primary">
          {mandateLabel(mandate)}
        </LokMandate.DetailLink>
        <span
          className={cn(
            "shrink-0 text-xs",
            status === "live" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}
        >
          {MANDATE_STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {mandate.clients.length} signed in as {mandate.grantor.username}
        {mandate.maxClients != null && ` (at most ${mandate.maxClients})`}
        {mandate.agentDevice && ` · only on ${mandate.agentDevice.name ?? mandate.agentDevice.deviceId}`}
      </p>
      {mandate.expiresAt && (
        <p className="text-xs text-muted-foreground/60">
          {status === "expired" ? "Expired " : "Expires "}
          <Timestamp date={mandate.expiresAt} relative />
        </p>
      )}
    </div>
  );
};
