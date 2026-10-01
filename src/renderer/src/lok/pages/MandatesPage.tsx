import { PageLayout } from "@/core/layout/PageLayout";
import { LOK_HELP } from "../help";
import { ListRender } from "@/core/layout/ListRender";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import React, { useMemo, useState } from "react";
import { useMandatesQuery } from "../api/graphql";
import MandateCard from "../components/cards/MandateCard";

/**
 * Apps allowed to act as you: the mandates you granted (org admins see all).
 * Each one lets a deployer start one exact app version signed in as its
 * grantor; revoking it signs every running instance out.
 */
const MandatesPage: React.FC = () => {
  const [showRevoked, setShowRevoked] = useState(false);
  const { data, error, loading, refetch } = useMandatesQuery();

  const mandates = useMemo(
    () => data?.mandates.filter((mandate) => showRevoked || !mandate.revokedAt),
    [data, showRevoked],
  );

  return (
    <PageLayout
      help={LOK_HELP.mandates}
      title="Mandates"
      pageActions={
        <div className="flex items-center gap-2">
          <Switch id="mandates-revoked" checked={showRevoked} onCheckedChange={setShowRevoked} />
          <Label htmlFor="mandates-revoked" className="text-xs text-muted-foreground">
            Revoked
          </Label>
        </div>
      }
    >
      <div className="p-3">
        <ListRender array={mandates} error={error} refetch={refetch}>
          {(item) => <MandateCard key={item.id} item={item} />}
        </ListRender>
        {!loading && mandates?.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            No app is allowed to act as you. Installing an app from the App Store asks for one.
          </p>
        )}
      </div>
    </PageLayout>
  );
};

export default MandatesPage;
