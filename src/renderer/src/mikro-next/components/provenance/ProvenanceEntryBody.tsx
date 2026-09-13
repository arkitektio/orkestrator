import { RekuestTask } from "@/linkers";
import { AppInfo } from "@/lok-next/components/protected/AppInfo";
import { UserInfo } from "@/lok-next/components/protected/UserInfo";
import Timestamp from "@/components/ui/timestamp";
import { HistoryKind, ProvenanceEntryFragment } from "../../api/graphql";
import { changeShape, summarizeFields } from "./provenanceSummary";

const VERB: Record<HistoryKind, string> = {
  [HistoryKind.Create]: "created this",
  [HistoryKind.Update]: "updated",
  [HistoryKind.Delete]: "deleted this",
};

/** Absolute date for the `title` of the relative one — the detail behind "2 days ago". */
const absolute = (date: unknown): string => {
  const parsed = new Date(date as string);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

/**
 * One provenance entry, as a sentence and its evidence.
 *
 * Shared by the card (`cards/HistoryCard`) and the compact rows in the dataset's
 * Info tab (`sidebars/ProvenanceSection`) so the two cannot drift — they differ
 * only in the frame they are drawn in.
 *
 * Deliberately typographic rather than badged. The badges this replaced carried
 * no information a reader wanted: one said the literal word "during" next to a
 * task link, and another boxed a field name that reads better as a label. What
 * a reader wants is who, when, through what, and what changed from what — so
 * that is what the three lines say.
 */
export const ProvenanceEntryBody = ({
  entry,
}: {
  entry: ProvenanceEntryFragment;
}) => {
  const fields = entry.effectiveChanges.map((change) => change.field);
  const summary = summarizeFields(fields);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Who, what, when. */}
      <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        <UserInfo sub={entry.user?.sub} />
        <span className="text-muted-foreground">
          {VERB[entry.kind]}
          {entry.kind === HistoryKind.Update && summary ? ` ${summary}` : ""}
        </span>
        {/* Wrapped rather than passed a `title`: react-timestamp forwards no
            arbitrary props, so the exact date has to hang off the span. */}
        <span className="text-xs text-muted-foreground" title={absolute(entry.date)}>
          <Timestamp date={entry.date} relative />
        </span>
      </div>

      {/* Through what. Named rather than badged: a link that says which task is
          worth following, one that says "during" is not. */}
      {(entry.client || entry.task) && (
        <div className="flex flex-row flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {entry.client && (
            <>
              <span>via</span>
              <AppInfo clientId={entry.client.clientId} />
            </>
          )}
          {entry.task && (
            <>
              <span>during task</span>
              <RekuestTask.DetailLink
                object={{ id: entry.task.taskId }}
                className="break-all font-mono underline-offset-2 hover:underline"
              >
                {entry.task.taskId}
              </RekuestTask.DetailLink>
            </>
          )}
        </div>
      )}

      {/* What changed, from what. */}
      {entry.effectiveChanges.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {entry.effectiveChanges.map((change) => {
            const shape = changeShape(change.oldValue, change.newValue);
            return (
              <div
                key={change.field}
                className="flex flex-row flex-wrap items-baseline gap-x-1.5 text-xs"
              >
                <span className="font-medium">{change.field}</span>
                {shape === "set" ? (
                  <span className="min-w-0 break-all font-mono">
                    {change.newValue}
                  </span>
                ) : shape === "cleared" ? (
                  <span className="min-w-0 break-all font-mono text-muted-foreground line-through">
                    {change.oldValue}
                  </span>
                ) : (
                  <>
                    <span className="min-w-0 break-all font-mono text-muted-foreground line-through">
                      {change.oldValue}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="min-w-0 break-all font-mono">
                      {change.newValue}
                    </span>
                  </>
                )}
                {shape !== "changed" && (
                  <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                    {shape}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
