import { PropertyDefinitionFragment, ValueKind } from "@/kraph/api/graphql";
import { Check, X } from "lucide-react";
import Timestamp from "@/components/ui/timestamp";

export const PropertyRenderer = ({
  value,
  definition,
}: {
  value: string | number | boolean | null | undefined;
  definition: PropertyDefinitionFragment;
}) => {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic">Empty</span>;
  }

  switch (definition.valueKind) {
    case ValueKind.Boolean:
      return value === "true" || value === true ? (
        <div className="flex items-center gap-1 text-emerald-500">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">True</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-rose-500">
          <X className="h-4 w-4" />
          <span className="text-sm font-medium">False</span>
        </div>
      );

    case ValueKind.Datetime:
      return (
        <span className="text-sm">
          <Timestamp date={String(value)} />
        </span>
      );

    case ValueKind.Int:
      return <span className="text-sm font-mono">{value}</span>;

    case ValueKind.Float:
      return <span className="text-sm font-mono">{value}</span>;

    case ValueKind.Category:
      // The category-options concept (definition.options) no longer exists
      // on the current backend schema; render the raw value.
      return <span className="text-sm">{value}</span>;

    case ValueKind.String:
    default:
      return <span className="text-sm">{value}</span>;
  }
};
