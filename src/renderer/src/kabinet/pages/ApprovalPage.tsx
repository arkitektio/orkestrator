import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Alert, AlertDescription } from "@/core/ui/alert";
import { Badge } from "@/core/ui/badge";
import Timestamp from "@/core/ui/timestamp";
import { KabinetApproval, KabinetBackend, KabinetRelease } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { TriangleAlert } from "lucide-react";
import React from "react";
import { useGetReleaseApprovalQuery } from "../api/graphql";
import { releaseIdentity } from "../appIdentity";
import { AppIcon } from "../components/AppIcon";
import { APPROVAL_STATUS_LABEL, approvalStatus } from "../lib/approvals";

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="truncate text-sm">{children}</span>
  </div>
);

/**
 * One release approval: who the release runs as, which deployer may start it,
 * and the lok mandate that makes it so (shown through lok's display).
 */
export const ApprovalPage = asDetailQueryRoute(useGetReleaseApprovalQuery, ({ data }) => {
  const approval = data.releaseApproval;
  const app = releaseIdentity(approval.release);
  const status = approvalStatus(approval);

  return (
    <KabinetApproval.ModelPage object={approval} title={approval.name}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
        <header className="flex items-center gap-4">
          <AppIcon app={app} size={56} className="size-14 rounded-2xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <KabinetRelease.DetailLink object={approval.release} className="text-2xl font-bold tracking-tight hover:text-primary">
                {app.name}
              </KabinetRelease.DetailLink>
              <Badge variant="secondary" className="rounded-full font-mono">
                v{approval.release.version}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full",
                  status === "active" && "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
                  status === "stale" && "border-amber-500/40 text-amber-700 dark:text-amber-300",
                )}
              >
                {APPROVAL_STATUS_LABEL[status]}
              </Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{approval.release.app.identifier}</p>
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label="Runs as">
            <StructureDisplay identifier="@lok/user" id={approval.approver.sub} variant="chip" />
          </Fact>
          <Fact label="Started by">
            <span className="font-mono text-xs">{approval.agent}</span>
          </Fact>
          <Fact label="Approved">
            <Timestamp date={approval.createdAt} relative />
          </Fact>
          {approval.revokedAt && (
            <Fact label="Revoked">
              <Timestamp date={approval.revokedAt} relative />
            </Fact>
          )}
          <Fact label="Backends">
            {approval.backends.length === 0
              ? "Any"
              : approval.backends.map((backend, index) => (
                  <React.Fragment key={backend.id}>
                    {index > 0 && ", "}
                    <KabinetBackend.DetailLink object={backend} className="hover:text-primary">
                      {backend.name}
                    </KabinetBackend.DetailLink>
                  </React.Fragment>
                ))}
          </Fact>
          <Fact label="Release digest">
            <span className="font-mono text-xs" title={approval.digest}>
              {approval.digest.slice(0, 16)}…
            </span>
          </Fact>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-base font-semibold tracking-tight">Mandate</h3>
          <StructureDisplay
            identifier="@lok/mandate"
            id={approval.mandateId}
            variant="card"
            fallback={<p className="font-mono text-xs text-muted-foreground">{approval.mandateId}</p>}
          />
        </section>
      </div>
    </KabinetApproval.ModelPage>
  );
});

export default ApprovalPage;
