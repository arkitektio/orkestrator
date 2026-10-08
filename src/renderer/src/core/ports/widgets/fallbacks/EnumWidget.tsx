import { SearchField, SearchOptions } from "@/core/forms/SearchField";
import {
  choicePresentation,
  portDescription,
  portLabel,
  portPlaceholder,
} from "@/core/ports/engine/portPresentation";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";
import { Button } from "@/core/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/core/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { notEmpty } from "@/core/util/utils";
import { X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";

type Choice = { value: string; label: string; description?: string | null };

/**
 * A port's `choices`, shown by how many there are: a few sit side by side,
 * a handful go in a dropdown, a long list is searched. The stored value is
 * the choice's `value` either way. Also what `ChoiceAssignWidget` renders
 * (the widget only adds a placeholder).
 */
export const ChoicePortField = (props: InputWidgetProps) => {
  const form = useFormContext();
  const name = pathToName(props.path);
  const choices = useMemo(
    () => (props.port.choices ?? []).filter(notEmpty) as Choice[],
    [props.port.choices],
  );
  const label = portLabel(props.port);
  const description = portDescription(props.port, props.widget);
  const placeholder = portPlaceholder(props.port, props.widget);
  const presentation = choicePresentation(choices.length);

  const search = useCallback(
    async (searching: SearchOptions) => {
      if (searching.values) {
        return choices.filter((c) => searching.values?.includes(c.value));
      }
      const needle = searching.search?.trim().toLowerCase();
      if (!needle) return choices;
      return choices.filter(
        (c) => c.label.toLowerCase().includes(needle) || c.value.toLowerCase().includes(needle),
      );
    },
    [choices],
  );

  if (presentation === "search") {
    return (
      <SearchField
        name={name}
        label={label}
        search={search}
        description={description}
        noOptionFoundPlaceholder="No options found"
        commandPlaceholder={placeholder}
      />
    );
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const chosen = choices.find((c) => c.value === value);
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            {presentation === "segmented" ? (
              <FormControl>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={value}
                  // Radix sends "" when the pressed one is pressed again:
                  // that clears an optional port and is ignored otherwise.
                  onValueChange={(next) => {
                    if (next) field.onChange(next);
                    else if (props.port.nullable) field.onChange(undefined);
                  }}
                  className="w-full"
                >
                  {choices.map((choice) => (
                    <ToggleGroupItem
                      key={choice.value}
                      value={choice.value}
                      title={choice.description ?? undefined}
                      className="min-w-0 flex-1 px-2"
                    >
                      <span className="truncate">{choice.label}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
            ) : (
              <div className="flex items-center gap-1">
                <Select value={value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {choices.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {props.port.nullable && value !== "" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Clear ${label}`}
                    onClick={() => field.onChange(undefined)}
                  >
                    <X />
                  </Button>
                )}
              </div>
            )}
            <FormDescription>{chosen?.description || description}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export const EnumWidget = ChoicePortField;
