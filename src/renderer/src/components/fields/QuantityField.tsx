import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  QuantityInput,
  QuantityInputProps,
} from "@/elektro/components/QuantityInput";
import { useFormContext } from "react-hook-form";
import { FieldProps } from "./types";

/**
 * react-hook-form binding for a pint-like quantity (Duration, Length, …). Stores
 * the wire string ("100 ms") as the field value; the magnitude/unit split is an
 * internal detail of {@link QuantityInput}. Mirrors the convention of the other
 * fields in this directory (see `FloatField`).
 */
export const QuantityField = (
  props: FieldProps &
    Pick<
      QuantityInputProps,
      "dimension" | "units" | "defaultUnit" | "placeholder"
    >,
) => {
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
            <QuantityInput
              dimension={props.dimension}
              units={props.units}
              defaultUnit={props.defaultUnit}
              placeholder={props.placeholder}
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          </FormControl>
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default QuantityField;
