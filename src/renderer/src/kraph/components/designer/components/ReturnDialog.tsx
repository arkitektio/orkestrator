import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { ReturnColumn } from "../OntologyGraphProvider";

// Helper to convert RGB array to CSS rgb() string
const rgbToCSS = (rgb: number[]): string => {
  const r = Math.round(rgb[0] * 255);
  const g = Math.round(rgb[1] * 255);
  const b = Math.round(rgb[2] * 255);
  return `rgb(${r}, ${g}, ${b})`;
};

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  nodeLabel: string;
  availableProperties: Array<{ name: string; type: string }>;
  initialColumns: ReturnColumn[];
  onSave: (columns: ReturnColumn[]) => void;
  pathColor?: number[];
}

export const ReturnDialog = ({
  open,
  onOpenChange,
  nodeId,
  nodeLabel,
  availableProperties,
  initialColumns,
  onSave,
  pathColor,
}: ReturnDialogProps) => {
  const [columns, setColumns] = useState<ReturnColumn[]>(initialColumns);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        nodeId,
        property: availableProperties[0]?.name || "label",
        alias: "",
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (
    index: number,
    field: keyof ReturnColumn,
    value: string
  ) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleSave = () => {
    onSave(columns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Return Columns for {nodeLabel}
            {pathColor && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: rgbToCSS(pathColor) }}
              />
            )}
          </DialogTitle>
          <DialogDescription>
            Select which properties to return from this node in the query
            results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {columns.map((column, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-end p-3 border rounded"
            >
              <div className="col-span-5">
                <Label htmlFor={`property-${index}`}>Property</Label>
                <Select
                  value={column.property}
                  onValueChange={(value) =>
                    updateColumn(index, "property", value)
                  }
                >
                  <SelectTrigger id={`property-${index}`}>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProperties.map((prop) => (
                      <SelectItem key={prop.name} value={prop.name}>
                        {prop.name} ({prop.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-5">
                <Label htmlFor={`alias-${index}`}>Alias (optional)</Label>
                <Input
                  id={`alias-${index}`}
                  value={column.alias || ""}
                  onChange={(e) => updateColumn(index, "alias", e.target.value)}
                  placeholder={`${nodeLabel}_${column.property}`}
                />
              </div>

              <div className="col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeColumn(index)}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addColumn}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Return Column
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Return Columns</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
