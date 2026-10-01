import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { PageAction } from "@/core/ui/page-action";
import { useState } from "react";
import { OutgoingStatus } from "../api/graphql";
import OutboxList from "../components/lists/OutboxList";
import { KUVERT_HELP } from "../help";
import { OutgoingMail } from "../linkers";

/** Mail sent from here, newest first; the failed ones on their own. */
const OutboxPage = () => {
  const [failed, setFailed] = useState(false);
  return (
    <OutgoingMail.ListPage
      title={failed ? "Failed to send" : "Outbox"}
      help={KUVERT_HELP.outbox}
      pageActions={
        <PageAction.Slot collapse="hide">
          <ToggleGroup type="single" size="sm" value={failed ? "failed" : "all"} onValueChange={(v) => v && setFailed(v === "failed")}>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
          </ToggleGroup>
        </PageAction.Slot>
      }
    >
      <div className="p-3">
        <OutboxList filters={failed ? { status: OutgoingStatus.Failed } : undefined} title="" />
      </div>
    </OutgoingMail.ListPage>
  );
};

export default OutboxPage;
