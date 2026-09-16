import { useActiveTabIdOrNull } from "@/command/tabs/TabsProvider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDebug, type DebugEntry } from "@/providers/debug/DebugContext";
import { Bug, Copy } from "lucide-react";

const serialize = (value: unknown): string => {
  if (value === undefined) return "—";
  if (value instanceof Error) {
    return JSON.stringify({ name: value.name, message: value.message, ...value }, null, 2);
  }
  try {
    return JSON.stringify(value, null, 2) ?? "undefined";
  } catch {
    return String(value);
  }
};

const status = (entry: DebugEntry): { text: string; className: string } => {
  if (entry.error) return { text: "error", className: "bg-destructive/15 text-destructive" };
  if (entry.loading) return { text: "loading", className: "bg-chart-2/15 text-chart-2" };
  return { text: "ok", className: "bg-primary/15 text-primary" };
};

const EntryView = ({ entry }: { entry: DebugEntry }) => {
  const s = status(entry);
  const text = serialize({ variables: entry.variables, error: entry.error, data: entry.data });
  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium">{entry.label}</span>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider", s.className)}>
          {s.text}
        </span>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          aria-label={`Copy ${entry.label}`}
          onClick={() => void navigator.clipboard?.writeText(text)}
        >
          <Copy className="mr-1 h-3 w-3" />
          Copy
        </Button>
      </header>
      {entry.variables !== undefined && (
        <pre className="overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[11px] leading-snug">
          {serialize(entry.variables)}
        </pre>
      )}
      <pre
        data-testid={`debug-${entry.error ? "error" : "data"}`}
        className="overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[11px] leading-snug"
      >
        {serialize(entry.error ?? entry.data)}
      </pre>
    </section>
  );
};

/**
 * Debug mode, as a small badge in the corner of the page (see `PageCorner`).
 *
 * Debug used to REPLACE the page with a JSON dump of its query, which meant
 * you could not look at the page and its data at the same time — the one
 * thing debugging is. Now the page renders as always, and this badge sits over
 * its bottom-right corner; clicking it shows what the active tab's page
 * loaded: the query's variables, its data, and its error if it has one.
 *
 * Rendered only in debug mode, so it costs nothing otherwise.
 */
export const DebugBadge = () => {
  const { debug, entries } = useDebug();
  const activeTabId = useActiveTabIdOrNull();

  if (!debug) return null;

  const visible = entries
    .filter((e) => e.tabId === activeTabId)
    .sort((a, b) => a.updatedAt - b.updatedAt);
  const hasError = visible.some((e) => e.error);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Debug: page state"
          title="Debug mode is on — click for this page's query state"
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs shadow-sm backdrop-blur-sm transition-colors",
            hasError
              ? "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25"
              : "border-chart-2/40 bg-chart-2/15 text-chart-2 hover:bg-chart-2/25",
          )}
        >
          <Bug className="h-3.5 w-3.5" />
          <span className="font-mono">{visible.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-[32rem] max-w-[90vw] p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Bug className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Page state</span>
          <span className="text-xs text-muted-foreground">
            {visible.length === 0 ? "nothing reported on this page" : `${visible.length} quer${visible.length === 1 ? "y" : "ies"}`}
          </span>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-3">
            {visible.map((entry) => (
              <EntryView key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default DebugBadge;
