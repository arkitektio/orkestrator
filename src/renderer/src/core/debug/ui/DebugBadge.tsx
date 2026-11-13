import { useActiveTabIdOrNull } from "@/core/tabs/TabsProvider";
import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { ScrollArea } from "@/core/ui/scroll-area";
import { cn } from "@/core/util/utils";
import { useDebug, type DebugEntry } from "@/core/debug/DebugContext";
import { useDiagnostics } from "@/core/diagnostics/useDiagnostics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/ui/tabs";
import { isElectron } from "@/core/util/platform";
import { Bug, Check, Copy, MonitorCog } from "lucide-react";
import { useEffect, useState } from "react";

import { ReportBugButton } from "./ReportBugButton";

const serialize = (value: unknown): string => {
  if (value === undefined) return "—";
  if (value instanceof Error) {
    // Spread first: `name`/`message` are non-enumerable on an Error, so they
    // have to be written out, and they must win over anything the subclass
    // carries under the same keys.
    return JSON.stringify({ ...value, name: value.name, message: value.message }, null, 2);
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

/** Copies every query shown in the popover, as one JSON array. */
const CopyAllButton = ({ entries }: { entries: DebugEntry[] }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    const text = serialize(
      entries.map((e) => ({
        label: e.label,
        variables: e.variables,
        // An Error serializes to `{}` once nested, so write its fields out.
        error: e.error instanceof Error ? { ...e.error, name: e.error.name, message: e.error.message } : e.error,
        data: e.data,
      })),
    );
    void navigator.clipboard?.writeText(text).then(() => setCopied(true));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      aria-label="Copy all queries"
      disabled={entries.length === 0}
      onClick={copy}
    >
      {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
      {copied ? "Copied" : "Copy all"}
    </Button>
  );
};

const clock = (at: number) => new Date(at).toLocaleTimeString();

/** One recorded line: when, what, and the raw text under it. */
const RecordRow = ({ at, head, tone, body }: { at: number; head: string; tone?: "error"; body?: string }) => (
  <section className="space-y-1">
    <header className="flex items-baseline gap-2">
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{clock(at)}</span>
      <span className={cn("min-w-0 break-words text-xs font-medium", tone === "error" && "text-destructive")}>{head}</span>
    </header>
    {body && (
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px] leading-snug">
        {body}
      </pre>
    )}
  </section>
);

const Nothing = ({ children }: { children: string }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

/** Opens this window's DevTools, or closes them. Desktop only: it goes through the Electron bridge. */
const DevToolsButton = () => {
  if (!isElectron()) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      aria-label="Toggle developer tools"
      onClick={() => void window.api?.toggleDevTools()}
    >
      <MonitorCog className="mr-1 h-3 w-3" />
      DevTools
    </Button>
  );
};

/**
 * Debug mode, as a small badge in the corner of the page (see `PageCorner`).
 *
 * Debug used to REPLACE the page with a JSON dump of its query, which meant
 * you could not look at the page and its data at the same time — the one
 * thing debugging is. Now the page renders as always, and this badge sits over
 * its bottom-right corner; clicking it shows what the active tab's page
 * loaded: the query's variables, its data, and its error if it has one — and
 * a way to report the page, since this is where you are when it is wrong.
 * The other tabs show what the window recorded since it opened: errors, failed
 * requests and console warnings (`core/diagnostics`).
 *
 * Rendered only in debug mode, so it costs nothing otherwise.
 */
export const DebugBadge = () => {
  const { debug, entries } = useDebug();
  const activeTabId = useActiveTabIdOrNull();
  const record = useDiagnostics();

  if (!debug) return null;

  const visible = entries
    .filter((e) => e.tabId === activeTabId)
    .sort((a, b) => a.updatedAt - b.updatedAt);
  const hasError = visible.some((e) => e.error);

  // What the recorder holds (`core/diagnostics`): the same record a bug report
  // draws on, newest first. Kept for the whole window, not per tab.
  const errors = [...record.errors].reverse();
  const requests = [...record.requests].reverse();
  const consoleLines = [...record.console].reverse();

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
          <span className="flex-1" />
          <CopyAllButton entries={visible} />
          <DevToolsButton />
          <ReportBugButton />
        </div>
        <Tabs defaultValue="queries" className="gap-0">
          <TabsList className="mx-3 mt-2 h-7">
            <TabsTrigger value="queries" className="text-xs">Queries {visible.length}</TabsTrigger>
            <TabsTrigger value="errors" className="text-xs">Errors {errors.length}</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs">Failed requests {requests.length}</TabsTrigger>
            <TabsTrigger value="console" className="text-xs">Console {consoleLines.length}</TabsTrigger>
          </TabsList>
          <ScrollArea className="max-h-[60vh]">
            <TabsContent value="queries" className="space-y-4 p-3">
              {visible.map((entry) => (
                <EntryView key={entry.id} entry={entry} />
              ))}
            </TabsContent>
            <TabsContent value="errors" className="space-y-3 p-3">
              {errors.length === 0 && <Nothing>No errors since this window opened.</Nothing>}
              {errors.map((error, index) => (
                <RecordRow
                  key={`${error.at}-${index}`}
                  at={error.at}
                  tone="error"
                  head={`${error.title ? `${error.title}: ` : ""}${error.message}${error.route ? ` (${error.route})` : ""}`}
                  body={error.technical}
                />
              ))}
            </TabsContent>
            <TabsContent value="requests" className="space-y-3 p-3">
              {requests.length === 0 && <Nothing>No request has failed since this window opened.</Nothing>}
              {requests.map((request, index) => (
                <RecordRow
                  key={`${request.at}-${index}`}
                  at={request.at}
                  tone="error"
                  head={`${request.service} ${request.kind} ${request.operation}${request.status != null ? ` (HTTP ${request.status})` : ""}`}
                  body={[request.message, request.variables !== undefined ? serialize(request.variables) : ""].filter(Boolean).join("\n")}
                />
              ))}
            </TabsContent>
            <TabsContent value="console" className="space-y-2 p-3">
              {consoleLines.length === 0 && <Nothing>No warnings or errors in the console.</Nothing>}
              {consoleLines.map((line, index) => (
                <RecordRow
                  key={`${line.at}-${index}`}
                  at={line.at}
                  tone={line.level === "error" ? "error" : undefined}
                  head={`${line.level}${line.count > 1 ? ` ×${line.count}` : ""}`}
                  body={line.text}
                />
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default DebugBadge;
