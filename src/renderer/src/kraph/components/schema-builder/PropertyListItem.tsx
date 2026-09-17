import { GripVertical, Search, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { PropertyDefinition, dataTypeConfigs } from "./utils";

interface PropertyListItemProps {
  property: PropertyDefinition;
  isActive: boolean;
  onClick: () => void;
}

export function PropertyListItem({
  property,
  isActive,
  onClick,
}: PropertyListItemProps) {
  const typeConfig = dataTypeConfigs[property.valueKind];

  if (!typeConfig) {
    return null; // Skip rendering if config not found
  }

  const TypeIcon = typeConfig.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group",
        "hover:bg-accent/50",
        isActive && "bg-accent border-l-4 border-primary",
        !isActive && "border-l-4 border-transparent"
      )}
    >
      {/* Drag Handle */}
      <div className="opacity-50 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Type Icon */}
      <div
        className={cn(
          "p-2 rounded-md",
          typeConfig.color.bg,
          typeConfig.color.border,
          "border"
        )}
      >
        <TypeIcon className={cn("h-4 w-4", typeConfig.color.text)} />
      </div>

      {/* Label & Key Stack */}
      <div className="flex-1 min-w-0">
        <div className="font-medium font-sans truncate">{property.label}</div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          {property.key}
        </div>
      </div>

      {/* Attribute Badges */}
      <div className="flex items-center gap-2">
        {property.index && (
          <div className="p-1 rounded bg-emerald-100">
            <Database className="h-3 w-3 text-emerald-700" />
          </div>
        )}
        {property.searchable && (
          <div className="p-1 rounded bg-blue-100">
            <Search className="h-3 w-3 text-blue-700" />
          </div>
        )}
      </div>
    </div>
  );
}
