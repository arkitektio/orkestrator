import React from "react";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { KabinetDeployment } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { ListDeploymentFragment, PodStatus } from "../../api/graphql";
import { releaseIdentity } from "../../appIdentity";
import { APPROVAL_STATUS_DOT, APPROVAL_STATUS_LABEL, approvalStatus } from "../../lib/approvals";
import { AppIcon } from "../AppIcon";
import { IconForBackendKind } from "../IconForBackendKind";
import { KabinetCard, StatusWord } from "./parts";

interface Props {
  item: ListDeploymentFragment;
}

/**
 * One deployment: the app and build it installs, on which backend, how it is
 * doing, and who it runs as (with the state of that approval).
 */
const TheCard = ({ item }: Props) => {
  const release = item.flavour.release;
  const app = releaseIdentity({ ...release, flavours: [item.flavour] });
  const approval = item.approval;
  const approvalState = approval ? approvalStatus(approval) : null;

  return (
    <KabinetDeployment.Smart object={item}>
      <KabinetCard
        tone={item.status === PodStatus.Failed ? "failed" : undefined}
        lead={<AppIcon app={app} size={36} className="size-9 rounded-lg text-xs" />}
        title={
          <KabinetDeployment.DetailLink object={item} className="transition-colors hover:text-primary">
            {app.name}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">v{release.version}</span>
          </KabinetDeployment.DetailLink>
        }
        aside={<StatusWord status={item.status} />}
        sub={
          <span className="flex min-w-0 items-center gap-1">
            {item.flavour.name} on
            <IconForBackendKind kind={item.backend.kind} className="size-3 shrink-0" />
            <span className="truncate">{item.backend.name}</span>
          </span>
        }
        footer={
          approval && approvalState ? (
            <>
              <span className="flex min-w-0 items-center gap-1 truncate">
                as <StructureDisplay identifier="@lok/user" id={approval.approver.sub} variant="inline" />
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className={cn("size-1.5 rounded-full", APPROVAL_STATUS_DOT[approvalState])} />
                {APPROVAL_STATUS_LABEL[approvalState]}
              </span>
            </>
          ) : undefined
        }
      />
    </KabinetDeployment.Smart>
  );
};

export default React.memo(TheCard);
