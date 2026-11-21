import { useAction } from "@/core/smart/localactions/registry";
import { usePerformAction } from "@/core/smart/localactions/useLocalAction";
import { Button } from "@/core/ui/button";
import { CopyButton } from "@/core/ui/copy-button";
import { Input } from "@/core/ui/input";
import Timestamp from "@/core/ui/timestamp";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { RekuestGuard } from "@/rekuest/api/hooks";
import { RefreshCw, WrapText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { POD_IDENTIFIER, logLines, logTone } from "../lib/podLogs";
import { DetailSection } from "./DetailSection";

const TONE = {
  error: "text-destructive",
  warning: "text-warning",
} as const;

/**
 * The `refresh-pod-logs` local action as a button beside the log: the same
 * run the pod's menu starts, so it spins for either and a second press stops
 * the waiting.
 */
const RefreshLogsButton = ({ pod }: { pod: string }) => {
  const action = useAction("refresh-pod-logs");
  const { assign, running, confirmationDialog } = usePerformAction({
    action,
    actionId: "refresh-pod-logs",
    state: { left: [{ identifier: POD_IDENTIFIER, id: pod }], isCommand: false },
  });

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => void assign()}>
        <RefreshCw className={cn("size-3", running && "animate-spin")} />
        {running ? "Asking…" : "Refresh"}
      </Button>
      {confirmationDialog}
    </>
  );
};

/**
 * What a pod said: its latest log dump, numbered, scrolled to the newest
 * line, with a filter. The section is always there, since "nothing logged
 * yet" is an answer on a pod page; refreshing asks the backend for a new dump.
 */
export const PodLog = ({
  pod,
  backendName,
  dump,
}: {
  pod: string;
  backendName: string;
  dump?: { logs: string; createdAt: string } | null;
}) => {
  const [filter, setFilter] = useState("");
  const [wrap, setWrap] = useState(true);
  const lines = useMemo(() => logLines(dump?.logs ?? ""), [dump?.logs]);
  const shown = useMemo(() => {
    const numbered = lines.map((text, index) => ({ text, number: index + 1 }));
    const needle = filter.trim().toLowerCase();
    return needle ? numbered.filter((line) => line.text.toLowerCase().includes(needle)) : numbered;
  }, [lines, filter]);

  // A log is read from its end: land on the newest line, and again on a new dump.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [dump?.createdAt]);

  const gutter = `${String(lines.length).length}ch`;

  return (
    <DetailSection
      title="Logs"
      count={lines.length || undefined}
      action={
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          {dump && (
            <span className="mr-1 whitespace-nowrap">
              read <Timestamp date={dump.createdAt} relative />
            </span>
          )}
          {lines.length > 0 && (
            <>
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter lines"
                className="h-7 w-36 text-xs"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-7", wrap && "bg-muted text-foreground")}
                    aria-pressed={wrap}
                    aria-label="Wrap long lines"
                    onClick={() => setWrap((current) => !current)}
                  >
                    <WrapText className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Wrap long lines</TooltipContent>
              </Tooltip>
              <CopyButton value={lines.join("\n")} title="Copy logs" />
            </>
          )}
          <RekuestGuard fallback={null}>
            <RefreshLogsButton pod={pod} />
          </RekuestGuard>
        </span>
      }
    >
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {dump
            ? "The pod had logged nothing when it was last read."
            : `No logs have been read from this pod yet. Refresh to ask ${backendName} for them.`}
        </p>
      ) : (
        <div
          ref={scroller}
          className="max-h-[65vh] min-h-24 overflow-auto rounded-md bg-muted/40 py-2 font-mono text-xs leading-5"
        >
          {shown.length === 0 ? (
            <p className="px-3 font-sans text-muted-foreground">No line contains “{filter.trim()}”.</p>
          ) : (
            shown.map((line) => {
              const tone = logTone(line.text);
              return (
                <div key={line.number} className={cn("flex gap-3 px-3 hover:bg-muted/60", !wrap && "w-max min-w-full")}>
                  <span
                    className="shrink-0 select-none text-right tabular-nums text-muted-foreground/40"
                    style={{ width: gutter }}
                  >
                    {line.number}
                  </span>
                  <span
                    className={cn(
                      "min-w-0",
                      wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
                      tone && TONE[tone],
                    )}
                  >
                    {line.text || " "}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </DetailSection>
  );
};
