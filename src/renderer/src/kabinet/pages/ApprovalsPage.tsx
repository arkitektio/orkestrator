import { PageLayout } from "@/core/layout/PageLayout";
import { ListRender } from "@/core/layout/ListRender";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import React, { useState } from "react";
import { useListReleaseApprovalsQuery } from "../api/graphql";
import ApprovalCard from "../components/cards/ApprovalCard";

/**
 * The releases people in the organization allowed to run as them. Installing
 * from the store creates one; revoking one stops new installs and, with its
 * lok mandate, signs running pods out.
 */
const ApprovalsPage: React.FC = () => {
  const [showRevoked, setShowRevoked] = useState(false);
  const { data, error, loading, refetch } = useListReleaseApprovalsQuery({
    variables: { filters: showRevoked ? undefined : { revoked: false } },
  });

  return (
    <PageLayout
      title="Approvals"
      pageActions={
        <div className="flex items-center gap-2">
          <Switch id="approvals-revoked" checked={showRevoked} onCheckedChange={setShowRevoked} />
          <Label htmlFor="approvals-revoked" className="text-xs text-muted-foreground">
            Revoked
          </Label>
        </div>
      }
    >
      <div className="p-3">
        <ListRender array={data?.releaseApprovals} error={error} refetch={refetch}>
          {(item) => <ApprovalCard key={item.id} item={item} />}
        </ListRender>
        {!loading && data?.releaseApprovals.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            No release is approved to run yet. Installing an app from the App Store approves it.
          </p>
        )}
      </div>
    </PageLayout>
  );
};

export default ApprovalsPage;
