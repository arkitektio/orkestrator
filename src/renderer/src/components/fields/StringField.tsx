import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FieldProps } from "./types";

export const StringField = (props: FieldProps & { placeholder?: string }) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {props.label != undefined ? props.label : props.name}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={props.placeholder ? props.placeholder : "Enter.."}
              {...field}
              type="string"
              className="text-slate-200"
            />
          </FormControl>
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

type AutoDerivedStringFieldProps = FieldProps & {
  sourceName: string;
  deriveValue: (sourceValue: string) => string;
  normalizeValue?: (value: string) => string;
  placeholder?: string;
};

export const AutoDerivedStringField = ({
  sourceName,
  deriveValue,
  normalizeValue = (value) => value,
  ...props
}: AutoDerivedStringFieldProps) => {
  const form = useFormContext();
  const sourceValue = useWatch({ control: form.control, name: sourceName });
  const fieldValue = useWatch({ control: form.control, name: props.name });

  useEffect(() => {
    const normalizedValue = typeof fieldValue === "string"
      ? normalizeValue(fieldValue)
      : fieldValue;

    if (typeof normalizedValue === "string" && fieldValue !== normalizedValue) {
      const { isDirty } = form.getFieldState(props.name);
      form.setValue(props.name, normalizedValue, {
        shouldValidate: true,
        shouldDirty: isDirty,
      });
      return;
    }

    if (typeof sourceValue !== "string") {
      return;
    }

    const { isDirty } = form.getFieldState(props.name);
    if (!isDirty) {
      const nextValue = normalizeValue(deriveValue(sourceValue));
      if (fieldValue !== nextValue) {
        form.setValue(props.name, nextValue, {
          shouldValidate: true,
        });
      }
    }
  }, [deriveValue, fieldValue, form, normalizeValue, props.name, sourceValue]);

  return <StringField {...props} />;
};
