import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { DescriptorOperator } from "@/rekuest/api/graphql";
import {
  ConditionDraft,
  OPERATOR_LABELS,
  toWireCondition,
} from "@/rekuest/lib/triggerConditions";
import { Plus, X } from "lucide-react";

const OPERATORS = Object.keys(OPERATOR_LABELS) as DescriptorOperator[];

const PLACEHOLDER: Partial<Record<DescriptorOperator, string>> = {
  [DescriptorOperator.In]: "a, b, c",
  [DescriptorOperator.NotIn]: "a, b, c",
  [DescriptorOperator.Gte]: "number",
  [DescriptorOperator.Lte]: "number",
  [DescriptorOperator.Matches]: "regular expression",
};

/**
 * Extra descriptor tests a signal must pass: `key operator value` rows,
 * all of which must hold. `keys` are the descriptor keys the service
 * declares for this signal; any other key can still be typed.
 */
export const ConditionsEditor = ({
  value,
  onChange,
  keys,
}: {
  value: ConditionDraft[];
  onChange: (value: ConditionDraft[]) => void;
  keys: string[];
}) => {
  const update = (index: number, patch: Partial<ConditionDraft>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="flex flex-col gap-2">
      {value.map((row, index) => {
        const checked = toWireCondition(row);
        return (
          <div key={index} className="flex items-center gap-2">
            <Input
              className="h-8 w-40 font-mono text-xs"
              value={row.key}
              placeholder="descriptor"
              list="rekuest-condition-keys"
              onChange={(e) => update(index, { key: e.target.value })}
            />
            <Select
              value={row.operator}
              onValueChange={(operator) =>
                update(index, { operator: operator as DescriptorOperator })
              }
            >
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {OPERATOR_LABELS[operator]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {row.operator !== DescriptorOperator.Exists && (
              <Input
                className="h-8 flex-1"
                value={row.value}
                placeholder={PLACEHOLDER[row.operator] ?? "value"}
                aria-invalid={!checked.ok && row.key.trim() !== ""}
                title={checked.ok ? undefined : checked.error}
                onChange={(e) => update(index, { value: e.target.value })}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 shrink-0"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              title="Remove condition"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      <datalist id="rekuest-condition-keys">
        {keys.map((key) => (
          <option key={key} value={key} />
        ))}
      </datalist>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 self-start px-2 text-xs text-muted-foreground"
        onClick={() =>
          onChange([
            ...value,
            { key: keys[0] ?? "", operator: DescriptorOperator.Equals, value: "" },
          ])
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add condition
      </Button>
    </div>
  );
};
