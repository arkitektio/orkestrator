import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import {
  DIMENSIONS,
  Dimension,
  formatQuantity,
  parseQuantity,
} from "@/lib/quantities";

export interface QuantityInputProps {
  /** Wire value, e.g. "100 ms". `null` / "" renders an empty magnitude. */
  value: string | null | undefined;
  /** Called with the re-serialized wire string on every magnitude/unit change. */
  onChange: (next: string) => void;
  /**
   * Elektro path: a fixed physical `Dimension` supplies the unit dropdown and the
   * default unit from the curated `DIMENSIONS` table.
   */
  dimension?: Dimension;
  /**
   * Rekuest path: an ad-hoc list of unit symbols (a QUANTITY port's
   * `proposedUnits`) supplies the dropdown when no `dimension` is given.
   */
  units?: string[];
  /**
   * Default / reference unit used when the wire value carries none (a QUANTITY
   * port's `referenceUnit`). Falls back to the first of `units`.
   */
  defaultUnit?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * A pint-like quantity editor: a numeric magnitude input paired with a unit
 * selector. Parses the incoming wire string ("100 ms") into a magnitude (100)
 * and unit ("ms") for display, and re-serializes to the wire format whenever
 * either part changes. Controlled — owns no value state itself.
 *
 * Units come from either a fixed `dimension` (elektro's curated table) or an
 * ad-hoc `units` list (a rekuest QUANTITY port's `proposedUnits`).
 */
export const QuantityInput = ({
  value,
  onChange,
  dimension,
  units: unitList,
  defaultUnit,
  placeholder,
  className,
  disabled,
}: QuantityInputProps) => {
  // Resolve the unit set + default unit from whichever source was given.
  const { symbols, baseUnit } = useMemo(() => {
    if (dimension) {
      const def = DIMENSIONS[dimension];
      return { symbols: def.units.map((u) => u.symbol), baseUnit: def.base };
    }
    const list = unitList ?? [];
    return { symbols: list, baseUnit: defaultUnit ?? list[0] ?? "" };
  }, [dimension, unitList, defaultUnit]);

  const parsed = parseQuantity(value);
  const magnitude = parsed.magnitude;
  const unit = parsed.unit || baseUnit;

  // Preserve an unexpected server unit by surfacing it as an extra option rather
  // than silently snapping it to a preset.
  const units = useMemo(() => {
    if (!unit || symbols.includes(unit)) return symbols;
    return [...symbols, unit];
  }, [symbols, unit]);

  const emit = (nextMagnitude: number | null, nextUnit: string) => {
    if (nextMagnitude == null) {
      onChange("");
      return;
    }
    onChange(formatQuantity(nextMagnitude, nextUnit));
  };

  return (
    <InputGroup className={cn("h-7", className)}>
      <InputGroupInput
        type="number"
        inputMode="decimal"
        placeholder={placeholder ?? "Value"}
        value={magnitude ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            emit(null, unit);
            return;
          }
          const parsed = parseFloat(raw);
          if (!Number.isNaN(parsed)) emit(parsed, unit);
        }}
      />
      <InputGroupAddon align="inline-end" className="p-0">
        <Select
          value={unit}
          disabled={disabled}
          onValueChange={(nextUnit) => emit(magnitude ?? 0, nextUnit)}
        >
          <SelectTrigger
            size="sm"
            className="h-6 border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </InputGroupAddon>
    </InputGroup>
  );
};

export default QuantityInput;
