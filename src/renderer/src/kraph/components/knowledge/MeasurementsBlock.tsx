import { Button } from "@/components/ui/button";
import type { KnowledgeStructureFragment } from "@/kraph/api/graphql";
import { MetricsTable } from "@/kraph/components/tables/MetricsTable";
import { ObjectButton } from "@/providers/smart/ObjectButton";
import type { Identifier, Object } from "@/types";
import { Microscope } from "lucide-react";

export type MeasurementsBlockProps = {
  identifier: Identifier;
  object: Object;
  metrics: KnowledgeStructureFragment["metrics"];
  onChanged?: () => void;
};

/** What has been measured on this datum, and the way to measure more. */
export const MeasurementsBlock = ({
  identifier,
  object,
  metrics,
  onChanged,
}: MeasurementsBlockProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-row items-center justify-between gap-2">
      <div className="text-sm font-semibold">Measurements</div>
      <ObjectButton
        objects={[{ identifier, id: object.id }]}
        sections={{ exclude: ["kraph"] }}
        expect={["@mikro/metric"]}
        onDone={onChanged}
      >
        <Button variant="outline" size="sm">
          <Microscope className="mr-2 h-4 w-4" />
          Measure
        </Button>
      </ObjectButton>
    </div>
    {metrics.length > 0 ? (
      <MetricsTable metrics={metrics} />
    ) : (
      <p className="text-xs text-muted-foreground">Nothing has been measured on this yet.</p>
    )}
  </div>
);

export default MeasurementsBlock;
