import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";
import { Switch } from "../ui/switch";
import { FieldProps } from "./types";

export const SwitchField = (
  props: FieldProps & { placeholder?: string; className?: string },
) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <div
            className={cn(
              "flex flex-row items-center justify-between w-full",
              props.className,
            )}
          >
            <FormLabel className="mr-2">
              {props.label != undefined ? props.label : props.name}
            </FormLabel>

            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </div>
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
