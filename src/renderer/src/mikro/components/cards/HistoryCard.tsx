import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MikroHistory } from "@/linkers";
import { ProvenanceEntryFragment } from "../../api/graphql";
import { ProvenanceEntryBody } from "../provenance/ProvenanceEntryBody";

interface HistoryCardProps {
  history: ProvenanceEntryFragment;
}

/**
 * One provenance entry as a standalone card, for the pages that give provenance
 * a rail of its own.
 *
 * The card is now just the frame: what it says lives in `ProvenanceEntryBody`,
 * shared with the dataset Info tab's compact rows. It used to have a
 * `CardHeader`/`CardTitle` of its own, which made every entry in a list read as
 * a heading — a list of twenty renames is not twenty headings.
 */
const TheCard = ({ history }: HistoryCardProps) => {
  return (
    <MikroHistory.Smart object={history}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-3">
          <ProvenanceEntryBody entry={history} />
        </CardContent>
      </Card>
    </MikroHistory.Smart>
  );
};

export default React.memo(TheCard);