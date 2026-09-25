import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";
import { useMetricsForStructureQuery } from "../api/graphql";

/**
 * All measurements recorded for a structure, including those not projected into
 * a graph. Fetched separately from the `Structure` fragment so the panel can
 * refetch on its own after a metric is recorded.
 */
export const MetricsForStructure = ({ structureId }: { structureId: string }) => {
  const { data, loading } = useMetricsForStructureQuery({
    variables: { structureId },
  });

  if (loading) {
    return <div className="text-xs text-muted-foreground p-6">Loading measurements…</div>;
  }

  const metrics = data?.metricsForStructure ?? [];

  if (metrics.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-6">
        No measurements recorded for this structure.
      </div>
    );
  }

  return (
    <div className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Measurement</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Unit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map((metric) => (
            <TableRow key={metric.id}>
              <TableCell>
                {metric.kind?.label || metric.kind?.key || metric.key}
              </TableCell>
              <TableCell>{String(metric.value)}</TableCell>
              <TableCell className="text-muted-foreground">
                {metric.unit || ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MetricsForStructure;
