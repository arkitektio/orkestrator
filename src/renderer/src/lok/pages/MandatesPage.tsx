import { LokMandate } from "@/core/linkers";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LOK_HELP } from "../help";
import { ListRender } from "@/core/layout/ListRender";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import React, { useState } from "react";
import { useMandatesQuery } from "../api/graphql";
import MandateCard from "../components/cards/MandateCard";

const PAGE = 20;

/**
 * Apps allowed to act as you: the mandates you granted (org admins see all),
 * newest first, a page at a time. Each one lets a deployer start one exact
 * app version signed in as its grantor; revoking it signs every running
 * instance out. The ones that no longer work (revoked or expired) are left
 * out by the server unless asked for.
 */
const MandatesPage: React.FC = () => {
  const [showEnded, setShowEnded] = useState(false);
  const { data, error, loading, refetch } = useMandatesQuery({
    variables: { filters: showEnded ? undefined : { live: true }, pagination: { offset: 0, limit: PAGE } },
  });
  const mandates = data?.mandates;

  return (
    <LokMandate.ListPage
      help={LOK_HELP.mandates}
      title="Mandates"
      pageActions={
        <div className="flex items-center gap-2">
          <Switch id="mandates-ended" checked={showEnded} onCheckedChange={setShowEnded} />
          <Label htmlFor="mandates-ended" className="text-xs text-muted-foreground">
            Revoked and expired
          </Label>
        </div>
      }
    >
      <div className="p-3">
        <ListRender
          array={mandates}
          error={error}
          refetch={refetch}
          limit={PAGE}
          minItemWidth={CARD_FRAME_MIN_WIDTH}
        >
          {(item) => <MandateCard key={item.id} item={item} />}
        </ListRender>
        {!loading && mandates?.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            No app is allowed to act as you. Installing an app from the App Store asks for one.
          </p>
        )}
      </div>
    </LokMandate.ListPage>
  );
};

export default MandatesPage;
