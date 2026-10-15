import { useState, useSyncExternalStore } from "react";
import { Activity, Copy, Database, Square } from "lucide-react";

import { useConnection } from "@/core/connection/arkitekt/provider";
import {
  classicPerf,
  measureCaches,
  summarizeReport,
  type CacheSize,
  type ClassicPerfReport,
} from "@/core/debug/classicPerf";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/ui/table";

const Rows = ({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; count: number; perSecond: number }[];
}) => (
  <div className="space-y-1">
    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
    {rows.length === 0 ? (
      <div className="text-sm text-muted-foreground">None.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>What</TableHead>
            <TableHead className="text-right">Count</TableHead>
            <TableHead className="text-right">/ s</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 25).map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-mono text-xs">{row.key}</TableCell>
              <TableCell className="text-right tabular-nums">{row.count}</TableCell>
              <TableCell className="text-right tabular-nums">{row.perSecond}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </div>
);

const mb = (bytes: number) => Math.round((bytes / 1_048_576) * 10) / 10;

/**
 * Start / stop a recording of the app's network operations, cache broadcasts
 * and per-tab React commits (`core/debug/classicPerf`): open the tabs, start,
 * do the thing that feels slow, come back and stop.
 */
export const ClassicPerfCard = () => {
  const connection = useConnection();
  const recording = useSyncExternalStore(classicPerf.subscribe, classicPerf.isRecording);
  const [report, setReport] = useState<ClassicPerfReport | null>(null);
  const [caches, setCaches] = useState<{ sizes: CacheSize[]; heapBytes?: number } | null>(null);

  const measure = () => {
    const sizes = measureCaches(connection?.serviceMap ?? {});
    // Chromium only: what the whole renderer's JS heap holds, to put the caches in proportion.
    const heapBytes = (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    setCaches({ sizes, heapBytes });
    console.table(sizes);
  };
  const summary = report ? summarizeReport(report) : null;

  const start = () => {
    setReport(null);
    classicPerf.start(connection?.serviceMap ?? {});
  };
  const stop = () => {
    const next = classicPerf.stop();
    if (!next) return;
    setReport(next);
    const rows = summarizeReport(next);
    console.info(`[classic perf] ${rows.seconds}s`);
    console.table(rows.operations);
    console.table(rows.broadcasts);
    console.table(rows.commits);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance recording
        </CardTitle>
        <CardDescription>
          Counts network operations, cache broadcasts and React commits per tab (shown or hidden) while it
          runs. Commit times are only measured in development builds. "Measure caches" sizes every
          Apollo cache and times one cleanup over it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {recording ? (
            <Button variant="default" className="gap-2" onClick={stop}>
              <Square className="h-3 w-3 fill-current" /> Stop and report (recording…)
            </Button>
          ) : (
            <Button variant="outline" className="gap-2" onClick={start}>
              <Activity className="h-4 w-4" /> Start recording
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={measure}>
            <Database className="h-4 w-4" /> Measure caches
          </Button>
          {report && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void navigator.clipboard?.writeText(JSON.stringify(report, null, 2))}
            >
              <Copy className="h-4 w-4" /> Copy report
            </Button>
          )}
        </div>
        {caches && (
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Apollo caches
              {caches.heapBytes !== undefined &&
                ` · JS heap ${mb(caches.heapBytes)} MB, caches ≈ ${mb(caches.sizes.reduce((sum, size) => sum + size.bytes, 0))} MB serialized`}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Objects</TableHead>
                  <TableHead className="text-right">Root fields</TableHead>
                  <TableHead className="text-right">MB</TableHead>
                  <TableHead className="text-right">gc ms</TableHead>
                  <TableHead className="text-right">Freed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caches.sizes.map((size) => (
                  <TableRow key={size.service}>
                    <TableCell className="font-mono text-xs">{size.service}</TableCell>
                    <TableCell className="text-right tabular-nums">{size.entities}</TableCell>
                    <TableCell className="text-right tabular-nums">{size.rootFields}</TableCell>
                    <TableCell className="text-right tabular-nums">{mb(size.bytes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{size.gcMs}</TableCell>
                    <TableCell className="text-right tabular-nums">{size.collected}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {summary && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Recorded {summary.seconds}s.</div>
            <Rows title="Network operations" rows={summary.operations} />
            <Rows title="Cache broadcasts" rows={summary.broadcasts} />
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Commits per tab
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tab</TableHead>
                    <TableHead className="text-right">Shown</TableHead>
                    <TableHead className="text-right">ms</TableHead>
                    <TableHead className="text-right">Hidden</TableHead>
                    <TableHead className="text-right">ms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.commits.map((row) => (
                    <TableRow key={row.tab}>
                      <TableCell className="font-mono text-xs">{row.tab}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.shown}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.shownMs}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.hidden}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.hiddenMs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
