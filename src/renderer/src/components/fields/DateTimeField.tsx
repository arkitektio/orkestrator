import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { DateTimePicker } from "../ui/datetime-picker";
import { FieldProps } from "./types";

export const DateTimeField = (props: FieldProps) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>
            {props.label != undefined ? props.label : props.name}
          </FormLabel>
          <DateTimePicker value={field.value} onChange={field.onChange} />
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
