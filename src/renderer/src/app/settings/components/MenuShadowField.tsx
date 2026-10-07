import { FormDescription, FormLabel } from "@/core/ui/form";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import type { Settings } from "@/core/settings/store/validator";
import { useFormContext, useWatch } from "react-hook-form";

const OPTIONS: { value: Settings["menuShadow"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
];

/** How much shadow the right-click menu casts. */
export const MenuShadowField = () => {
  const { control, setValue } = useFormContext<Settings>();
  const shadow = useWatch({ control, name: "menuShadow" });

  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="space-y-1">
        <FormLabel>Menu shadow</FormLabel>
        <FormDescription>How strongly the right-click menu lifts off the page</FormDescription>
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        value={shadow}
        // Radix reports "" when the pressed item is pressed again; a shadow
        // cannot be un-chosen, so ignore that.
        onValueChange={(value) => {
          if (value) setValue("menuShadow", value as Settings["menuShadow"], { shouldDirty: true });
        }}
        aria-label="Menu shadow"
      >
        {OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="px-3">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
