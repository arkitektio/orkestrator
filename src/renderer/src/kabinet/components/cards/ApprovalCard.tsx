import React from "react";
import { Card } from "@/core/ui/card";
import Timestamp from "@/core/ui/timestamp";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { KabinetApproval } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ListReleaseApprovalFragment } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { APPROVAL_STATUS_LABEL, approvalStatus } from "../../lib/approvals";
import { AppIcon } from "../AppIcon";

interface Props {
  item: ListReleaseApprovalFragment;
}

/** One release someone allowed to run as them, and which deployer may start it. */
const TheCard = ({ item }: Props) => {
  const app = releaseIdentity(item.release);
  const status = approvalStatus(item);

  return (
    <KabinetApproval.Smart object={item}>
      <Card className={cn("flex h-full flex-col gap-1.5 p-3", status === "revoked" && "opacity-60")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <AppIcon app={app} size={20} className="size-5 shrink-0" />
            <KabinetApproval.DetailLink
              object={item}
              className="min-w-0 truncate text-sm font-medium leading-tight hover:text-primary transition-colors"
            >
              {app.name} <span className="font-mono text-xs text-muted-foreground">v{item.release.version}</span>
            </KabinetApproval.DetailLink>
          </div>
          <span
            className={cn(
              "shrink-0 text-xs",
              status === "active" && "text-emerald-600 dark:text-emerald-400",
              status === "stale" && "text-amber-600 dark:text-amber-400",
              status === "revoked" && "text-muted-foreground",
            )}
          >
            {APPROVAL_STATUS_LABEL[status]}
          </span>
        </div>

        <p className="truncate text-xs text-muted-foreground">
          as <StructureDisplay identifier="@lok/user" id={item.approver.sub} variant="inline" /> · by {item.agent}
        </p>

        <div className="mt-auto pt-1 text-xs text-muted-foreground/60">
          <Timestamp date={item.createdAt} relative />
        </div>
      </Card>
    </KabinetApproval.Smart>
  );
};

export default React.memo(TheCard);
