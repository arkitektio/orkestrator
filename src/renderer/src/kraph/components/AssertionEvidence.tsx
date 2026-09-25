import { Button } from "@/core/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { FlaskConical } from "lucide-react";
import { useMetricsForAssertionLazyQuery } from "../api/graphql";

/**
 * The metrics backing an assertion — the evidence the claim rests on. Loaded
 * lazily: a claim's evidence is only worth a round trip once someone asks for
 * it.
 */
export const AssertionEvidence = ({ assertionId }: { assertionId: string }) => {
  const [load, { data, loading, called }] = useMetricsForAssertionLazyQuery({
    variables: { assertionId },
  });

  const metrics = data?.metricsForAssertion ?? [];

  return (
    <Popover onOpenChange={(open) => open && !called && load()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          style={{ pointerEvents: "all" }}
        >
          <FlaskConical className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-2">
          <h4 className="font-medium text-sm leading-none">Supporting evidence</h4>
          {loading && (
            <p className="text-xs text-muted-foreground">Loading evidence…</p>
          )}
          {called && !loading && metrics.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No metrics support this assertion.
            </p>
          )}
          {metrics.map((metric) => (
            <div key={metric.id} className="flex justify-between text-xs gap-2">
              <span className="text-muted-foreground truncate">
                {metric.kind?.label || metric.kind?.key || metric.key}
              </span>
              <span className="font-mono shrink-0">
                {String(metric.value)}
                {metric.unit ? ` ${metric.unit}` : ""}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AssertionEvidence;
