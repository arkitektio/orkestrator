import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSortableItem, useSortableListId } from "@/lib/dnd/sortable";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { PropertyListItem } from "./PropertyListItem";
import { PropertyDefinition } from "./utils";

interface PropertyListProps {
  properties: PropertyDefinition[];
  selectedIndex: number | null;
  onSelectProperty: (index: number) => void;
  onAddProperty: () => void;
  onReorderProperties: (startIndex: number, endIndex: number) => void;
}

/** One row: draggable, and a place to drop another row of this list. */
const SortableProperty = ({
  list,
  index,
  onReorder,
  children,
}: {
  list: string;
  index: number;
  onReorder: (startIndex: number, endIndex: number) => void;
  children: React.ReactNode;
}) => {
  const { ref, edge } = useSortableItem({ list, index, onReorder });

  return (
    // The rows hold still during the drag; `layout` slides them once the
    // order has changed.
    <motion.div
      ref={ref}
      layout="position"
      transition={{ duration: 0.15 }}
      className="relative dragging:opacity-50"
    >
      {edge && (
        <div
          className={cn(
            "pointer-events-none absolute left-0 right-0 h-1 rounded bg-primary",
            edge === "before" ? "top-0 -mt-1" : "bottom-0 -mb-1",
          )}
        />
      )}
      {children}
    </motion.div>
  );
};

export function PropertyList({
  properties,
  selectedIndex,
  onSelectProperty,
  onAddProperty,
  onReorderProperties,
}: PropertyListProps) {
  const list = useSortableListId();

  return (
    <div className="h-full flex flex-col border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-1">Properties</h2>
        <p className="text-sm text-muted-foreground">
          {properties.length} {properties.length === 1 ? "field" : "fields"}
        </p>
      </div>

      {/* Property List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {properties.map((property, index) => (
            <SortableProperty
              key={property.key || index}
              list={list}
              index={index}
              onReorder={onReorderProperties}
            >
              <PropertyListItem
                property={property}
                isActive={selectedIndex === index}
                onClick={() => onSelectProperty(index)}
              />
            </SortableProperty>
          ))}
        </div>
      </ScrollArea>

      {/* Add Button */}
      <div className="p-4 border-t">
        <Button
          onClick={onAddProperty}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>
    </div>
  );
}
