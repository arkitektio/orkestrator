import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/core/ui/form";
import { Input } from "@/core/ui/input";
import { useFormContext } from "react-hook-form";
import { FieldProps } from "./types";

export const FloatField = (props: FieldProps & { placeholder?: string }) => {
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
              placeholder={
                props.placeholder ? props.placeholder : "0"
              }
              {...field}
              onChange={(e) => {
                field.onChange(e);
              }}
              // The value stays the typed string (the schema coerces it);
              // `number` only brings the stepper and the numeric keyboard.
              type="number"
              step="any"
              value={field.value ?? ""}
              className="w-full text-foreground tabular-nums"
            />
          </FormControl>
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
