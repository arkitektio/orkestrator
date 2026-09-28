import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { EditableMechanismGlobal } from "../../lib/modelSerialization";
import { QuantityInput } from "@/core/forms/QuantityInput";
import { useMechanismParamMeta } from "./MechanismCatalog";

const emptyGlobal = (): EditableMechanismGlobal => ({
  mechanism: "",
  param: "",
  // A unit-bearing `GenericQuantity` string (e.g. "2 dimensionless"); empty until entered.
  value: "",
  description: null,
});

/**
 * One GLOBAL-parameter row. Split out so it can look up the parameter's declared
 * units from the mechanism catalogue (a hook, so it can't live in a `.map`
 * callback) and ground the value input accordingly.
 */
const MechanismGlobalRow = ({
  global,
  onChange,
  onRemove,
}: {
  global: EditableMechanismGlobal;
  onChange: (update: Partial<EditableMechanismGlobal>) => void;
  onRemove: () => void;
}) => {
  const meta = useMechanismParamMeta(global.mechanism, global.param);
  return (
    <div className="space-y-1.5 rounded border p-2">
      <div className="flex items-center gap-1">
        <Input
          className="h-7 font-mono"
          placeholder="mechanism (e.g. hh)"
          value={global.mechanism}
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
          placeholder="param (e.g. q10)"
          value={global.param}
          onChange={(e) => onChange({ param: e.target.value })}
        />
        <QuantityInput
          value={global.value}
          onChange={(value) => onChange({ value })}
          units={meta?.proposedUnits ?? undefined}
          defaultUnit={meta?.referenceUnit ?? undefined}
        />
      </div>
      <Input
        className="h-7"
        placeholder="description (optional)"
        value={global.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value || null })}
      />
    </div>
  );
};

/**
 * Controlled editor for the model-wide `mechanismGlobals` — NEURON GLOBAL
 * variables (e.g. `q10` on `hh`) set once per model. Owns no state.
 *
 * The value is a grounded `GenericQuantity`: its unit dropdown is seeded from the
 * mechanism catalogue (the parameter's `proposedUnits` / `referenceUnit`) once
 * `mechanism` + `param` match a known parameter; otherwise it falls back to
 * free-form quantity entry.
 */
export const MechanismGlobalsEditor = ({
  value,
  onChange,
}: {
  value: EditableMechanismGlobal[];
  onChange: (globals: EditableMechanismGlobal[]) => void;
}) => {
  const patch = (index: number, update: Partial<EditableMechanismGlobal>) =>
    onChange(value.map((g, i) => (i === index ? { ...g, ...update } : g)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No global parameters.</p>
      )}
      {value.map((g, i) => (
        <MechanismGlobalRow
          key={i}
          global={g}
          onChange={(update) => patch(i, update)}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
        />
      ))}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => onChange([...value, emptyGlobal()])}
      >
        <Plus className="mr-2 h-3 w-3" />
        Add global parameter
      </Button>
    </div>
  );
};
