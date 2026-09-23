import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SortableList } from "@/lib/dnd/SortableList";
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

export function PropertyList({
  properties,
  selectedIndex,
  onSelectProperty,
  onAddProperty,
  onReorderProperties,
}: PropertyListProps) {
  // A property without a key yet (just added) is still a row of its own.
  const idOf = (property: PropertyDefinition, index: number) =>
    property.key || `property-${index}`;
  const ids = properties.map(idOf);
  const items = properties.map((property, index) => ({ property, index }));

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
        {/* The rows and nothing else: their places are measured from this
            box. They part around the one being dragged, as the rail's tabs do. */}
        <SortableList
          items={items}
          getId={({ property, index }) => idOf(property, index)}
          onReorder={(id, to) => onReorderProperties(ids.indexOf(id), to)}
          className="space-y-1"
        >
          {({ property, index }, row) => (
            <motion.div
              ref={row.ref}
              layout="position"
              transition={{ duration: 0.15 }}
              className="dragging:opacity-0"
            >
              <PropertyListItem
                property={property}
                isActive={selectedIndex === index}
                onClick={() => onSelectProperty(index)}
              />
            </motion.div>
          )}
        </SortableList>
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
