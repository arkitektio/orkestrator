import { DateTimePicker } from "@/core/ui/datetime-picker";
import { Controller, useFormContext } from "react-hook-form";

/**
 * An optional due date in a todo form (react-hook-form): a date and time,
 * kept as a `Date` in the form and sent as ISO by the caller. Empty is no date.
 */
export const DueDateField = ({ name = "dueAt", description }: { name?: string; description?: string }) => {
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Due</span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DateTimePicker value={field.value ?? undefined} onChange={(date) => field.onChange(date ?? null)} hourCycle={24} placeholder="No date" />
        )}
      />
      {description && <span className="text-xs text-muted-foreground">{description}</span>}
    </div>
  );
};
