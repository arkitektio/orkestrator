import { FormControl, FormField, FormItem, FormLabel } from "@/core/ui/form";
import { cn } from "@/core/util/utils";
import { useFormContext } from "react-hook-form";
import { CATEGORY_COLORS } from "./options";

/** A row of colour swatches; clicking the chosen one clears it. */
export const ColorField = ({ name, label = "Color" }: { name: string; label?: string }) => {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => field.onChange(field.value === color ? null : color)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 border-transparent transition-transform hover:scale-110",
                    field.value === color && "border-foreground",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
};
