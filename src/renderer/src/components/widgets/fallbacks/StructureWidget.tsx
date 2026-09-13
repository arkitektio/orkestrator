import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputWidgetProps } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
import { useFormContext } from "react-hook-form";

/**
 * STRUCTURE fallback (no search widget declared): a plain id input that still
 * stores the canonical `{ __identifier, object }` value the schema and the
 * server expect, instead of a bare string.
 */
export const StructureWidget = (props: InputWidgetProps) => {
  const form = useFormContext();
  const identifier = props.port.identifier;

  return (
    <FormField
      control={form.control}
      name={pathToName(props.path)}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.port.label || props.port.key}</FormLabel>
          <FormControl>
            <Input
              placeholder={`Id of the ${identifier ?? "structure"}`}
              value={
                field.value && typeof field.value === "object"
                  ? String((field.value as { object?: unknown }).object ?? "")
                  : ""
              }
              onChange={(e) =>
                field.onChange(
                  e.target.value === ""
                    ? undefined
                    : { __identifier: identifier, object: e.target.value },
                )
              }
              onBlur={field.onBlur}
              name={field.name}
              className="text-slate-200"
            />
          </FormControl>
          <FormDescription>{props.port.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
