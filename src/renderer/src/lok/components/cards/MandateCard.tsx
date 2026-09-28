import React from "react";
import { Card } from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import { LokMandate } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ListMandateFragment } from "../../api/graphql";
import { MANDATE_STATUS_LABEL, mandateStatus, mandateSubject } from "../../lib/mandateLabels";

interface Props {
  item: ListMandateFragment;
}

/**
 * One app allowed to act as its grantor: what runs (the subject), who
 * starts it (the agent), and how many instances are signed in right now.
 */
const TheCard = ({ item }: Props) => {
  const subject = mandateSubject(item);
  const status = mandateStatus(item);

  return (
    <LokMandate.Smart object={item}>
      <Card className={cn("flex h-full flex-col gap-1.5 p-3", status === "revoked" && "opacity-60")}>
        <div className="flex items-baseline justify-between gap-2">
          <LokMandate.DetailLink
            object={item}
            className="min-w-0 truncate text-sm font-medium leading-tight hover:text-primary transition-colors"
          >
            {subject.identifier}
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

        <p className="truncate text-xs text-muted-foreground">
          {subject.version && <span className="font-mono">v{subject.version}</span>}
          {subject.version && " · "}
          run by {item.agentIdentifier}
          {item.agentDevice && ` on ${item.agentDevice.name ?? item.agentDevice.deviceId}`}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground/60">
          <Timestamp date={item.createdAt} relative />
          {status !== "revoked" && (
            <span className="tabular-nums" title="Instances signed in under this mandate">
              {item.clients.length}
              {item.maxClients != null && ` / ${item.maxClients}`} running
            </span>
          )}
        </div>
      </Card>
    </LokMandate.Smart>
  );
};

export default React.memo(TheCard);
