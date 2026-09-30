import { useDialog } from "@/core/dialogs/registry";
import { PageLayout } from "@/core/layout/PageLayout";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Trash2 } from "lucide-react";
import { ReactNode, useState } from "react";
import {
  AccessLogEntryFragment,
  useGetRetentionQuery,
  useListAccessLogQuery,
  useSetRetentionMutation,
} from "../api/graphql";
import { formatAt, retentionChoices, retentionFromValue, retentionLabel, retentionValue } from "../format";

const PAGE = 50;

const Section = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div className="flex flex-col gap-0.5">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);

/** How long the server keeps points and segments; changing it deletes older ones right away. */
const RetentionPicker = () => {
  const { data } = useGetRetentionQuery();
  const [setRetention, { loading }] = useSetRetentionMutation();
  if (!data) return null;
  const current = data.retention.days;

  const change = async (value: string) => {
    const days = retentionFromValue(value);
    try {
      await setRetention({ variables: { days } });
      toast.success(days == null ? "Keeping everything" : `Keeping the last ${retentionLabel(days)}`);
    } catch (error) {
      toast.error("Could not change retention: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <Section
      title="Keep points and segments"
      description="Older points, visits and trips are deleted when you shorten this, and on every later upload. Places are kept."
    >
      <Select value={retentionValue(current)} onValueChange={change} disabled={loading}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {retentionChoices(current).map((days) => (
            <SelectItem key={retentionValue(days)} value={retentionValue(days)}>
              {retentionLabel(days)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Section>
  );
};

const AccessRow = ({ entry }: { entry: AccessLogEntryFragment }) => (
  <div className="grid grid-cols-[7rem_1fr_auto] items-baseline gap-3 py-1.5 text-sm">
    <span className="tabular-nums text-muted-foreground">{formatAt(entry.at)}</span>
    <span className="flex min-w-0 flex-col">
      <span className="truncate">
        {entry.operation}
        <span className="ml-2 text-xs text-muted-foreground">{entry.range}</span>
      </span>
      {(entry.clientId || entry.deviceId) && (
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {[entry.clientId, entry.deviceId].filter(Boolean).join(" · ")}
        </span>
      )}
    </span>
    <span className="tabular-nums text-xs text-muted-foreground">
      {entry.rows === 1 ? "1 row" : `${entry.rows} rows`}
    </span>
  </div>
);

/** Every read of the user's data, newest first; grows a page at a time. */
const AccessLog = () => {
  const [limit, setLimit] = useState(PAGE);
  const { data, previousData, loading } = useListAccessLogQuery({ variables: { limit, offset: 0 } });
  const entries = (data ?? previousData)?.accessLog ?? [];
  if (entries.length === 0) return null;

  return (
    <Section title="Reads" description="Every time an app read your location data: what, which range, and who asked.">
      <div className="flex flex-col divide-y">
        {entries.map((entry) => (
          <AccessRow key={entry.id} entry={entry} />
        ))}
      </div>
      {entries.length >= limit && (
        <Button variant="ghost" size="sm" className="self-start" disabled={loading} onClick={() => setLimit(limit + PAGE)}>
          {loading ? "Loading…" : "Show more"}
        </Button>
      )}
    </Section>
  );
};

/** What lokate keeps about you and who read it: retention, the access log, and deleting the server copy. */
const PrivacyPage = () => {
  const { openDialog } = useDialog();
  return (
    <PageLayout
      title="Privacy"
      pageActions={
        <PageAction
          size="sm"
          variant="outline"
          collapse="icon"
          icon={<Trash2 />}
          onClick={() => openDialog("lokatedeleteservercopy", {}, { size: "small" })}
        >
          Delete server copy
        </PageAction>
      }
    >
      <div className="flex max-w-3xl flex-col gap-8 p-6">
        <RetentionPicker />
        <AccessLog />
      </div>
    </PageLayout>
  );
};

export default PrivacyPage;
