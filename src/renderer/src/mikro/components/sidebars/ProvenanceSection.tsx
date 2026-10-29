import { MikroHistory } from "@/core/linkers";
import { ProvenanceEntryFragment } from "../../api/graphql";
import { ProvenanceEntryBody } from "../provenance/ProvenanceEntryBody";

/**
 * The edit history, as rows rather than cards.
 *
 * Same content as `cards/HistoryCard` — both draw `ProvenanceEntryBody` — in the
 * bordered-row frame the rest of the Info tab uses, because here it is one
 * section among five rather than a rail of its own.
 *
 * Nothing at all when nothing was recorded, unless the caller passes
 * `emptyText` — a tab that IS the history has nothing else to show.
 */
export const ProvenanceSection = ({
  entries,
  emptyText,
}: {
  entries: readonly ProvenanceEntryFragment[];
  emptyText?: string;
}) => {
  if (entries.length === 0 && !emptyText) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-baseline justify-between gap-2">
        <div className="text-xs font-semibold">Provenance</div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {entries.length}
        </span>
      </div>

      {entries.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          {emptyText}
        </span>
      ) : (
        entries.map((entry) => (
          <MikroHistory.Smart object={entry} key={entry.id}>
            <div className="rounded-md border border-border/60 p-2 transition-colors hover:bg-accent/50">
              <ProvenanceEntryBody entry={entry} />
            </div>
          </MikroHistory.Smart>
        ))
      )}
    </div>
  );
};
