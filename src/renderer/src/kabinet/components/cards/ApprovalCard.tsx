import React from "react";
import Timestamp from "@/core/ui/timestamp";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { KabinetApproval } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ListReleaseApprovalFragment } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { APPROVAL_STATUS_DOT, APPROVAL_STATUS_LABEL, approvalStatus } from "../../lib/approvals";
import { AppIcon } from "../AppIcon";
import { KabinetCard } from "./parts";

interface Props {
  item: ListReleaseApprovalFragment;
}

/** One release someone allowed to run as them, and which deployer may start it. */
const TheCard = ({ item }: Props) => {
  const app = releaseIdentity(item.release);
  const status = approvalStatus(item);

  return (
    <KabinetApproval.Smart object={item}>
      <KabinetCard
        tone={status === "revoked" ? "muted" : undefined}
        lead={<AppIcon app={app} size={36} className="size-9 rounded-lg text-xs" />}
        title={
          <KabinetApproval.DetailLink object={item} className="transition-colors hover:text-primary">
            {app.name}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">v{item.release.version}</span>
          </KabinetApproval.DetailLink>
        }
        aside={
          <span className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", APPROVAL_STATUS_DOT[status])} />
            {APPROVAL_STATUS_LABEL[status]}
          </span>
        }
        sub={
          <span className="flex min-w-0 items-center gap-1">
            as <StructureDisplay identifier="@lok/user" id={item.approver.sub} variant="inline" />
          </span>
        }
        footer={
          <>
            <span className="truncate font-mono" title="The deployer that may start it">
              {item.agent}
            </span>
            <span className="shrink-0">
              <Timestamp date={item.createdAt} relative />
            </span>
          </>
        }
      />
    </KabinetApproval.Smart>
  );
};

export default React.memo(TheCard);
