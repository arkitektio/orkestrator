import { KabinetApproval } from "@/core/linkers";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import React, { useMemo, useState } from "react";
import { useListSearch } from "../components/ListSearch";
import ApprovalList from "../components/lists/ApprovalList";
import { KABINET_HELP } from "../help";

/**
 * The releases people in the organization allowed to run as them. Installing
 * from the store creates one; revoking one stops new installs and, with its
 * lok mandate, signs running pods out.
 */
const ApprovalsPage: React.FC = () => {
  const [showRevoked, setShowRevoked] = useState(false);
  const { search, setSearch, filters: searchFilters } = useListSearch();
  const filters = useMemo(
    () => ({ ...searchFilters, ...(showRevoked ? {} : { revoked: false }) }),
    [searchFilters, showRevoked],
  );

  return (
    <KabinetApproval.ListPage
      title="Approvals"
      help={KABINET_HELP.approvals}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search approvals…" />
          <div className="flex items-center gap-2">
            <Switch id="approvals-revoked" checked={showRevoked} onCheckedChange={setShowRevoked} />
            <Label htmlFor="approvals-revoked" className="text-xs text-muted-foreground">
              Revoked
            </Label>
          </div>
        </>
      }
    >
      <div className="p-3">
        <ApprovalList title="" filters={filters} defaultLimit={40} />
      </div>
    </KabinetApproval.ListPage>
  );
};

export default ApprovalsPage;
