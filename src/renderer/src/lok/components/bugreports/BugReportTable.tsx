import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { LokBugReport } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/ui/table";
import Timestamp from "@/core/ui/timestamp";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useState } from "react";
import { useBugReportsQuery, type BugReportFilter } from "../../api/graphql";

const PAGE = 30;

type Show = "open" | "resolved" | "all";

/**
 * Bug reports people filed from inside a client, newest first. Narrow it to
 * one client, release or app with `filters` (the list on those pages), or
 * leave it open for the whole organization.
 *
 * An admin gets every report of the organization, anyone else their own: the
 * server decides, so this is the same list for both.
 */
export const BugReportTable = ({
  filters,
  title,
  search = false,
  hideWhenEmpty = false,
}: {
  filters?: Pick<BugReportFilter, "client" | "release" | "app" | "reporter">;
  title?: string;
  /** Show the search field and the open / resolved switch. */
  search?: boolean;
  /** Render nothing while there is nothing to list (a section of another page). */
  hideWhenEmpty?: boolean;
}) => {
  const [show, setShow] = useState<Show>("open");
  const [term, setTerm] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const { data, previousData, error, refetch } = useBugReportsQuery({
    variables: {
      filters: {
        ...filters,
        ...(show === "all" ? {} : { resolved: show === "resolved" }),
        ...(term.trim() ? { search: term.trim() } : {}),
      },
      pagination: { limit: limit + 1, offset: 0 },
    },
    fetchPolicy: "cache-and-network",
  });

  if (error) return <QueryError error={error} onRetry={() => refetch()} resource="list of bug reports" />;

  const rows = (data ?? previousData)?.bugReports ?? [];
  const shown = rows.slice(0, limit);
  const untouched = show === "open" && !term.trim();
  if (hideWhenEmpty && untouched && rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <span className="flex-1" />
        {search && (
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search reports"
            className="h-8 w-56"
          />
        )}
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={show}
          onValueChange={(value) => value && setShow(value as Show)}
        >
          <ToggleGroupItem value="open">Open</ToggleGroupItem>
          <ToggleGroupItem value="resolved">Resolved</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {show === "resolved" ? "No resolved reports." : term.trim() ? "No report matches." : "No open bug reports."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>App</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Reported by</TableHead>
              <TableHead>When</TableHead>
              <TableHead>State</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="max-w-[28rem]">
                  <LokBugReport.DetailLink object={report} className="font-medium hover:underline">
                    {report.title}
                  </LokBugReport.DetailLink>
                  {report.route && <div className="truncate font-mono text-xs text-muted-foreground">{report.route}</div>}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {report.release ? `${report.release.app.identifier} ${report.release.version}` : (report.appVersion ?? "")}
                </TableCell>
                <TableCell className="whitespace-nowrap">{report.client?.node?.name ?? report.client?.name ?? ""}</TableCell>
                <TableCell className="whitespace-nowrap">{report.reporter?.username ?? ""}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  <Timestamp date={report.createdAt} relative />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={report.isResolved ? "secondary" : "outline"}>{report.isResolved ? "Resolved" : "Open"}</Badge>
                  {report.forwardedAt && (
                    <Badge variant="secondary" className="ml-1">
                      Forwarded
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {rows.length > limit && (
        <Button variant="outline" size="sm" onClick={() => setLimit((value) => value + PAGE)}>
          Show more
        </Button>
      )}
    </section>
  );
};

export default BugReportTable;
