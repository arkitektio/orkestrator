import { QuantityField } from "@/core/components/fields/QuantityField";
import { InputWidgetProps } from "@/core/lib/ports/types";
import { pathToName } from "@/core/lib/ports/utils";

/**
 * Input widget for a QUANTITY port. The value is stored as a magnitude+unit wire
 * string ("100 ms"); the unit dropdown is populated from the port's
 * `proposedUnits`, defaulting to its `referenceUnit`. Mirrors `FloatWidget`.
 */
export const QuantityWidget = (props: InputWidgetProps) => {
  const proposed = props.port.proposedUnits ?? [];
  const reference = props.port.referenceUnit ?? undefined;

  // Ensure the reference unit is always offered, even if not in proposedUnits.
  const units =
    reference && !proposed.includes(reference)
      ? [reference, ...proposed]
      : proposed;

  return (
    <QuantityField
      name={pathToName(props.path)}
      label={props.port.label || props.port.key}
      description={props.port.description || undefined}
      units={units}
      defaultUnit={reference}
    />
  );
};
