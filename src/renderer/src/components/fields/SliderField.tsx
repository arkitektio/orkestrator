import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { FieldProps } from "./types";

function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T>;

  return function (...args: Parameters<T>) {
    latestArgs = args;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      fn(...latestArgs);
      timeout = null;
    }, wait);
  };
}

export const SliderField = (
  props: FieldProps & {
    min?: number;
    max?: number;
    step?: number;
    throttle?: number;
  },
) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <div className="flex flex-row items-center justify-between w-full gap-2 relative">
            <FormLabel>
              {props.label != undefined ? props.label : props.name}
            </FormLabel>

            <FormControl>
              <Slider
                value={[field.value]}
                onValueChange={(z) => {
                  if (props.throttle) {
                    throttle(() => field.onChange(z[0]), props.throttle)();
                  } else field.onChange(z[0]);
                }}
                min={props.min}
                max={props.max}
                step={props.step}
              />
            </FormControl>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                field.onChange(null);
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              Clear
            </Button>
          </div>
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
