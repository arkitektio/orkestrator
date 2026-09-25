import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { EditableCompartment } from "../../lib/modelSerialization";
import { QuantityInput } from "@/core/components/fields/QuantityInput";
import { useMechanismParamMeta } from "./MechanismCatalog";

type EditableSectionParam = EditableCompartment["sectionParams"][number];

const emptyParam = (): EditableSectionParam => ({
  mechanism: "",
  param: "",
  description: null,
  // A unit-bearing `GenericQuantity` string (e.g. "0.12 S/cm2"); empty until entered.
  distribution: { value: "" },
});

/**
 * One `sectionParam` row. Split out so it can look up the parameter's declared
 * units from the mechanism catalogue (a hook, so it can't live in a `.map`
 * callback) and ground the value input accordingly.
 */
const SectionParamRow = ({
  param,
  onChange,
  onRemove,
}: {
  param: EditableSectionParam;
  onChange: (update: Partial<EditableSectionParam>) => void;
  onRemove: () => void;
}) => {
  const meta = useMechanismParamMeta(param.mechanism, param.param);
  return (
    <div className="space-y-1.5 rounded border p-2">
      <div className="flex items-center gap-1">
        <Input
          className="h-7 font-mono"
          placeholder="mechanism"
          value={param.mechanism}
          onChange={(e) => onChange({ mechanism: e.target.value })}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 flex-none p-0 text-muted-foreground"
          title="Remove parameter"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Input
          className="h-7 font-mono"
          placeholder="param"
          value={param.param}
          onChange={(e) => onChange({ param: e.target.value })}
        />
        <QuantityInput
          value={param.distribution.value}
          onChange={(value) =>
            onChange({ distribution: { ...param.distribution, value } })
          }
          units={meta?.proposedUnits ?? undefined}
          defaultUnit={meta?.referenceUnit ?? undefined}
        />
      </div>
      <Input
        className="h-7"
        placeholder="description (optional)"
        value={param.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value || null })}
      />
    </div>
  );
};

/**
 * Controlled editor for a compartment's `sectionParams` (mechanism-specific
 * parameters). Only the uniform `distribution.value` is edited here — LINEAR /
 * EXPRESSION distributions are not surfaced (the fragment reads only `value`).
 *
 * The value is a grounded `GenericQuantity`: its unit dropdown is seeded from the
 * mechanism catalogue (the parameter's `proposedUnits` / `referenceUnit`) once
 * `mechanism` + `param` match a known parameter; otherwise it falls back to
 * free-form quantity entry.
 */
export const SectionParamsEditor = ({
  value,
  onChange,
}: {
  value: EditableSectionParam[];
  onChange: (params: EditableSectionParam[]) => void;
}) => {
  const patch = (index: number, update: Partial<EditableSectionParam>) =>
    onChange(value.map((p, i) => (i === index ? { ...p, ...update } : p)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No section parameters.</p>
      )}
      {value.map((p, i) => (
        <SectionParamRow
          key={i}
          param={p}
          onChange={(update) => patch(i, update)}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
        />
      ))}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => onChange([...value, emptyParam()])}
      >
        <Plus className="mr-2 h-3 w-3" />
        Add section parameter
      </Button>
    </div>
  );
};
