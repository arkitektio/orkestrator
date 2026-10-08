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
import { useState } from "react";

const OPERATORS = Object.keys(OPERATOR_LABELS) as DescriptorOperator[];

const PLACEHOLDER: Partial<Record<DescriptorOperator, string>> = {
  [DescriptorOperator.In]: "a, b, c",
  [DescriptorOperator.NotIn]: "a, b, c",
  [DescriptorOperator.Gte]: "number",
  [DescriptorOperator.Lte]: "number",
  [DescriptorOperator.Matches]: "regular expression",
};

const OTHER = "__other__";

const sampleText = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

/**
 * Extra descriptor tests a signal must pass: `key operator value` rows,
 * all of which must hold. `keys` are the descriptor keys the service
 * declares for this signal (a select; "Other…" takes any key). `sample` is
 * one real signal's descriptors: its values are offered while typing, and
 * as one-click conditions under the rows.
 */
export const ConditionsEditor = ({
  value,
  onChange,
  keys,
  sample,
  showErrors,
}: {
  value: ConditionDraft[];
  onChange: (value: ConditionDraft[]) => void;
  keys: string[];
  sample?: Record<string, unknown>;
  /** Also flag rows that are still empty (after a submit attempt). */
  showErrors?: boolean;
}) => {
  // Rows whose key is typed rather than picked. Reset on removal: the
  // indexes shift, and a typed key outside `keys` stays an input anyway.
  const [typed, setTyped] = useState<Set<number>>(() => new Set());

  const update = (index: number, patch: Partial<ConditionDraft>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const suggestions = Object.entries(sample ?? {}).filter(
    ([key, v]) =>
      v !== null && typeof v !== "object" && !value.some((row) => row.key === key),
  );

  return (
    <div className="flex flex-col gap-2">
      {value.map((row, index) => {
        const checked = toWireCondition(row);
        const flagged = !checked.ok && (showErrors || row.key.trim() !== "");
        const freeKey =
          keys.length === 0 || typed.has(index) || (row.key !== "" && !keys.includes(row.key));
        const known = sample?.[row.key];
        return (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {freeKey ? (
                <Input
                  className="h-8 w-40 font-mono text-xs"
                  value={row.key}
                  placeholder="descriptor"
                  aria-invalid={flagged && row.key.trim() === ""}
                  onChange={(e) => update(index, { key: e.target.value })}
                />
              ) : (
                <Select
                  value={row.key}
                  onValueChange={(key) => {
                    if (key !== OTHER) return update(index, { key });
                    setTyped(new Set(typed).add(index));
                    update(index, { key: "" });
                  }}
                >
                  <SelectTrigger className="h-8 w-40 font-mono text-xs">
                    <SelectValue placeholder="descriptor" />
                  </SelectTrigger>
                  <SelectContent>
                    {keys.map((key) => (
                      <SelectItem key={key} value={key} className="font-mono text-xs">
                        {key}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER}>Other…</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
                <>
                  <Input
                    className="h-8 flex-1"
                    value={row.value}
                    placeholder={PLACEHOLDER[row.operator] ?? "value"}
                    aria-invalid={flagged && row.key.trim() !== ""}
                    list={known !== undefined ? `rekuest-condition-values-${index}` : undefined}
                    onChange={(e) => update(index, { value: e.target.value })}
                  />
                  {known !== undefined && (
                    <datalist id={`rekuest-condition-values-${index}`}>
                      <option value={sampleText(known)} />
                    </datalist>
                  )}
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8 shrink-0"
                onClick={() => {
                  setTyped(new Set());
                  onChange(value.filter((_, i) => i !== index));
                }}
                title="Remove condition"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {flagged && <p className="text-xs text-destructive">{checked.error}</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
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
        {suggestions.map(([key, v]) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 font-mono text-[11px] font-normal text-muted-foreground"
            title="Add this as a condition"
            onClick={() =>
              onChange([
                ...value,
                { key, operator: DescriptorOperator.Equals, value: sampleText(v) },
              ])
            }
          >
            {key} is {sampleText(v)}
          </Button>
        ))}
      </div>
    </div>
  );
};
