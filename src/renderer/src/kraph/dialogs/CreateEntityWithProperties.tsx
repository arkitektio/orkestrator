import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  EntityCategoryFragment,
  PropertyDefinitionFragment,
  useAssertEntityExistsMutation,
  useAssertMetricValueMutation,
  ValueKind,
} from "@/kraph/api/graphql";
import { buildItoldyousoMetric, isManuallyAssertable } from "@/kraph/lib/itoldyouso";
import { enUS } from "date-fns/locale";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type PropertyValue = string | number | boolean | Date | null | undefined;

type CreateEntityFormData = {
  externalId?: string;
  name?: string;
  properties: Record<string, PropertyValue>;
};

const validateProperty = (
  value: PropertyValue,
  definition: PropertyDefinitionFragment,
): string | null => {
  // Type-specific validation
  if (value !== null && value !== undefined && value !== "") {
    switch (definition.valueKind) {
      case ValueKind.Int:
        if (typeof value === "string" && isNaN(parseInt(value))) {
          return `${definition.label || definition.key} must be a valid integer`;
        }
        break;

      case ValueKind.Float:
        if (typeof value === "string" && isNaN(parseFloat(value))) {
          return `${definition.label || definition.key} must be a valid number`;
        }
        break;

      case ValueKind.Boolean:
        if (typeof value !== "boolean") {
          return `${definition.label || definition.key} must be true or false`;
        }
        break;
    }
  }

  return null;
};

const useCreateEntityForm = (category: EntityCategoryFragment) => {
  const defaultProperties: Record<string, PropertyValue> = {};

  category.propertyDefinitions?.forEach((def) => {
    defaultProperties[def.key] = null;
  });

  const form = useForm<CreateEntityFormData>({
    defaultValues: {
      externalId: "",
      name: "",
      properties: defaultProperties,
    },
    mode: "onBlur",
  });

  const validateForm = (data: CreateEntityFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    category.propertyDefinitions?.forEach((def) => {
      const value = data.properties[def.key];
      const error = validateProperty(value, def);
      if (error) {
        errors[def.key] = error;
      }
    });

    return errors;
  };

  return { form, validateForm };
};

const serializePropertyValue = (
  value: PropertyValue,
  kind: ValueKind,
): string | number | boolean | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (kind) {
    case ValueKind.Int:
      return typeof value === "string" ? parseInt(value) : Number(value);

    case ValueKind.Float:
      return typeof value === "string" ? parseFloat(value) : Number(value);

    case ValueKind.Boolean:
      return Boolean(value);

    case ValueKind.Datetime:
      if (value instanceof Date) {
        return value.toISOString();
      }
      return String(value);

    case ValueKind.String:
    case ValueKind.Category:
    default:
      return String(value);
  }
};

const PropertyField = ({
  definition,
  value,
  onChange,
  error,
}: {
  definition: PropertyDefinitionFragment;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
  error?: string;
}) => {
  const renderInput = () => {
    switch (definition.valueKind) {
      case ValueKind.Boolean:
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={onChange}
            />
            <span className="text-sm text-muted-foreground">
              {value ? "True" : "False"}
            </span>
          </div>
        );

      case ValueKind.Int:
        return (
          <Input
            type="number"
            step="1"
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
            placeholder={`Enter ${definition.label || definition.key}`}
            className={error ? "border-red-500" : ""}
          />
        );

      case ValueKind.Float:
        return (
          <Input
            type="number"
            step="any"
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={`Enter ${definition.label || definition.key}`}
            className={error ? "border-red-500" : ""}
          />
        );

      case ValueKind.Datetime:
        return (
          <DateTimePicker
            value={value instanceof Date ? value : value ? new Date(String(value)) : undefined}
            onChange={(date) => onChange(date || null)}
            className={error ? "border-red-500" : ""}
            locale={enUS}
            weekStartsOn={0}
            showWeekNumber={false}
            showOutsideDays={true}
          />
        );

      case ValueKind.String:
        // Multi-line for longer descriptions
        if (definition.description && definition.description.length > 50) {
          return (
            <Textarea
              value={value ? String(value) : ""}
              onChange={(e) => onChange(e.target.value || null)}
              placeholder={`Enter ${definition.label || definition.key}`}
              className={error ? "border-red-500" : ""}
              rows={3}
            />
          );
        }
        return (
          <Input
            type="text"
            value={value ? String(value) : ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${definition.label || definition.key}`}
            className={error ? "border-red-500" : ""}
          />
        );

      case ValueKind.Category:
      default:
        return (
          <Input
            type="text"
            value={value ? String(value) : ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={`Enter ${definition.label || definition.key}`}
            className={error ? "border-red-500" : ""}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={definition.key}>
        {definition.label || definition.key}
      </Label>
      {definition.description && (
        <p className="text-xs text-muted-foreground">{definition.description}</p>
      )}
      {renderInput()}
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export const CreateEntityWithPropertiesDialog = (props: {
  category: EntityCategoryFragment;
}) => {
  const { closeDialog } = useDialog();
  const { form, validateForm } = useCreateEntityForm(props.category);
  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});

  const [assertEntity, { loading }] = useAssertEntityExistsMutation({
    onError: (error) => {
      toast.error(`Failed to create entity: ${error.message}`);
    },
  });

  const [assertMetricValue] = useAssertMetricValueMutation({
    refetchQueries: ["EntityNodes", "GetEntityCategory"],
  });

  const onSubmit = async (data: CreateEntityFormData) => {
    // Validate all properties
    const errors = validateForm(data);

    if (Object.keys(errors).length > 0) {
      setPropertyErrors(errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setPropertyErrors({});

    // The entity is created bare: properties are derived, so the values typed
    // here are not part of it. They are recorded afterwards as "itoldyouso"
    // metrics against the new entity — evidence with no measurement behind it,
    // which the category's derivation rules then fold into the properties.
    const created = await assertEntity({
      variables: {
        input: {
          // Claims name the word, not the category row.
          term: props.category.term?.key ?? props.category.key,
        },
      },
    });

    const entityId = created.data?.assertEntityExists.instance.id;
    if (!entityId) return;

    const assertions = (props.category.propertyDefinitions ?? [])
      .filter((def) => isManuallyAssertable(def.valueKind))
      .map((def) => ({ def, value: data.properties[def.key] }))
      .filter(({ value }) => value !== undefined && value !== null && value !== "");

    try {
      for (const { def, value } of assertions) {
        await assertMetricValue({
          variables: {
            input: buildItoldyousoMetric({
              entityId,
              key: def.key,
              valueKind: def.valueKind,
              value: serializePropertyValue(value, def.valueKind),
              unit: def.unit,
            }),
          },
        });
      }
    } catch (error) {
      // The entity exists either way — say so rather than implying nothing happened.
      toast.error(
        `Entity created, but recording its values failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      closeDialog();
      return;
    }

    toast.success("Entity created successfully");
    closeDialog();
  };

  return (
    <div className="space-y-4 p-6 max-h-[80vh] overflow-y-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Create New {props.category.label}</h2>
        <p className="text-sm text-muted-foreground">
          Fill in the details to create a new entity
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Dynamic Property Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Properties</h3>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {props.category.propertyDefinitions.map((def) => (
                <Controller
                  key={def.key}
                  name={`properties.${def.key}`}
                  control={form.control}
                  render={({ field }) => (
                    <PropertyField
                      definition={def}
                      value={field.value}
                      onChange={field.onChange}
                      error={propertyErrors[def.key]}
                    />
                  )}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Entity"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeDialog()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
