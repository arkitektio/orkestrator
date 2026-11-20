import { useSelf } from "@/core/connection/useSelf";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Alert, AlertDescription } from "@/core/ui/alert";
import Timestamp from "@/core/ui/timestamp";
import { KabinetApproval, KabinetBackend, KabinetRelease } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { TriangleAlert } from "lucide-react";
import React from "react";
import { useGetReleaseApprovalQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import { DetailSection } from "../components/DetailSection";
import { RevokeApprovalButton } from "../components/RevokeApprovalButton";
import { DeployButton } from "../components/store/StoreParts";
import { APPROVAL_STATUS_DOT, APPROVAL_STATUS_LABEL, approvalStatus } from "../lib/approvals";
import { KABINET_HELP } from "../help";

/**
 * One release approval: who the release runs as, which deployer may start it,
 * and the lok mandate that makes it so (shown through lok's display). The
 * facts are the Info rail's; the body is the mandate.
 */
export const ApprovalPage = asDetailQueryRoute(useGetReleaseApprovalQuery, ({ data }) => {
  const approval = data.releaseApproval;
  const app = releaseIdentity(approval.release);
  const status = approvalStatus(approval);
  // Deploying acts as the approver: only your own approval is yours to use.
  const { userId } = useSelf();
  const deployable = status === "active" && approval.approver.sub === userId;

  return (
    <KabinetApproval.ModelPage
      object={approval}
      title={approval.name}
      help={KABINET_HELP.approval}
      pageActions={
        deployable ? (
          <DeployButton release={approval.release} approval={approval.id} size="default" />
        ) : undefined
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Status",
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", APPROVAL_STATUS_DOT[status])} />
                  {APPROVAL_STATUS_LABEL[status]}
                </span>,
              ],
              ["Runs as", <StructureDisplay identifier="@lok/user" id={approval.approver.sub} variant="inline" />],
              ["Started by", <span className="break-all font-mono text-xs">{approval.agent}</span>],
              ["Approved", <Timestamp date={approval.createdAt} relative />],
              ["Revoked", approval.revokedAt && <Timestamp date={approval.revokedAt} relative />],
              [
                "Backends",
                approval.backends.length === 0
                  ? "Any"
                  : approval.backends.map((backend, index) => (
                      <React.Fragment key={backend.id}>
                        {index > 0 && ", "}
                        <KabinetBackend.DetailLink object={backend} className="hover:underline">
                          {backend.name}
                        </KabinetBackend.DetailLink>
                      </React.Fragment>
                    )),
              ],
              [
                "Release digest",
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs" title={approval.digest}>
                    {approval.digest}
                  </span>
                  <CopyButton value={approval.digest} title="Copy digest" />
                </span>,
              ],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="flex flex-col gap-6 p-3">
        <header className="flex items-center gap-3">
          <AppIcon app={app} size={40} className="size-10 rounded-xl" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KabinetRelease.DetailLink object={approval.release} className="hover:underline">
                {app.name}
              </KabinetRelease.DetailLink>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                v{approval.release.version}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", APPROVAL_STATUS_DOT[status])} />
              {APPROVAL_STATUS_LABEL[status]} · as{" "}
              <StructureDisplay identifier="@lok/user" id={approval.approver.sub} variant="inline" />
            </p>
          </div>
        </header>

        {status === "stale" && (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertDescription>
              The release was published again with different scopes, requirements or images since it
              was approved. Nothing new deploys under this approval; install the release again to
              review and approve what it is now.
            </AlertDescription>
          </Alert>
        )}

        <DetailSection
          title="Mandate"
          action={<RevokeApprovalButton approval={approval} label="Revoke mandate" />}
        >
          <StructureDisplay
            identifier="@lok/mandate"
            id={approval.mandateId}
            variant="card"
            fallback={<p className="font-mono text-xs text-muted-foreground">{approval.mandateId}</p>}
          />
        </DetailSection>
      </div>
    </KabinetApproval.ModelPage>
  );
});

export default ApprovalPage;
