import { Button } from "@/core/ui/button";
import { DateTimePicker } from "@/core/ui/datetime-picker";
import { Input } from "@/core/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Textarea } from "@/core/ui/textarea";
import { GetEntityDocument, PropertyDefinitionFragment, useAssertMetricValueMutation, ValueKind } from "@/kraph/api/graphql";
import { buildItoldyousoMetric, isManuallyAssertable } from "@/kraph/lib/itoldyouso";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const PropertyEditor = ({
  entityId,
  definition,
  value,
}: {
  entityId: string;
  definition: PropertyDefinitionFragment;
  value: string | number | boolean | null | undefined;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [assertMetricValue, { loading }] = useAssertMetricValueMutation({
    refetchQueries: [{ query: GetEntityDocument, variables: { id: entityId } }],
  });

  const assertable = isManuallyAssertable(definition.valueKind);

  const handleSave = async () => {
    try {
      // Properties are derived, so a manual edit is recorded as the weakest
      // evidence there is: an "itoldyouso" metric with no measurement behind
      // it. The derivation rule folds it in like any other observation.
      await assertMetricValue({
        variables: {
          input: buildItoldyousoMetric({
            entityId,
            key: definition.key,
            valueKind: definition.valueKind,
            value: currentValue,
            unit: definition.unit,
          }),
        },
      });
      setIsOpen(false);
      toast.success("Value asserted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to assert value");
    }
  };

  const renderInput = () => {
    const stringValue =
      currentValue === null || currentValue === undefined
        ? ""
        : String(currentValue);

    switch (definition.valueKind) {
      case ValueKind.Boolean:
        return (
          <div className="flex items-center gap-2">
            <Button
              variant={currentValue === "true" || currentValue === true ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentValue(true)}
            >
              True
            </Button>
            <Button
              variant={currentValue === "false" || currentValue === false ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentValue(false)}
            >
              False
            </Button>
          </div>
        );
      case ValueKind.Int:
        return (
          <Input
            type="number"
            step="1"
            value={stringValue}
            onChange={(e) => setCurrentValue(e.target.value)}
          />
        );
      case ValueKind.Float:
        return (
          <Input
            type="number"
            step="any"
            value={stringValue}
            onChange={(e) => setCurrentValue(e.target.value)}
          />
        );
      case ValueKind.Datetime:
        return (
          <DateTimePicker
            value={stringValue ? new Date(stringValue) : undefined}
            onChange={(date) => setCurrentValue(date?.toISOString())}
          />
        );
      case ValueKind.String:
        if (definition.description && definition.description.length > 50) {
          return (
            <Textarea
              value={stringValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              rows={3}
            />
          );
        }
        return (
          <Input
            value={stringValue}
            onChange={(e) => setCurrentValue(e.target.value)}
          />
        );
      default:
        return (
          <Input
            value={stringValue}
            onChange={(e) => setCurrentValue(e.target.value)}
          />
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={!assertable}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted"
          disabled={!assertable}
          title={
            assertable
              ? undefined
              : `${definition.valueKind} properties cannot be asserted by hand`
          }
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{definition.label || definition.key}</h4>
            <p className="text-sm text-muted-foreground">
              {definition.description ||
                "Asserting a value records it as evidence with no measurement behind it. The derivation rule decides what the property becomes."}
            </p>
          </div>
          {renderInput()}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
