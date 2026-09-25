import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { ValueKind } from "../../api/graphql";
import { dataTypeConfigs } from "./utils";

interface DataTypeSelectorProps {
  value: ValueKind;
  onChange: (value: ValueKind) => void;
}

export function DataTypeSelector({ value, onChange }: DataTypeSelectorProps) {
  return (
    <TooltipProvider>
      <div className="grid grid-cols-4 gap-1.5">
        {Object.entries(dataTypeConfigs).map(([kind, config]) => {
          const Icon = config.icon;
          const isSelected = value === kind;

          return (
            <Tooltip key={kind}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(kind as ValueKind)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-colors",
                    isSelected
                      ? `${config.color.border} ${config.color.bg} border-current`
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      isSelected ? config.color.text : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-medium truncate",
                      isSelected ? config.color.text : "text-muted-foreground"
                    )}
                  >
                    {config.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Use {config.label.toLowerCase()} values for this field.
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
