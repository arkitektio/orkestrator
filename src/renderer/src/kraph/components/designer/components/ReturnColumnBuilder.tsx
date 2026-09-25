import { Button } from "@/core/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { ReturnColumn } from "../OntologyGraphProvider";
import { MyNode } from "../types";

interface ReturnColumnBuilderProps {
  nodes: MyNode[]; // All nodes from all paths
  existingColumns: ReturnColumn[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (columns: ReturnColumn[]) => void;
}

// Property configurations for different node types
const NODE_PROPERTIES: Record<string, Array<{ property: string; label: string; isId?: boolean; type?: string }>> = {
  entitycategory: [
    { property: "id", label: "ID", isId: true },
    { property: "label", label: "Label" },
    { property: "instanceKind", label: "Instance Kind" },
    { property: "description", label: "Description" },
  ],
  protocoleventcategory: [
    { property: "id", label: "ID", isId: true },
    { property: "label", label: "Label" },
    { property: "description", label: "Description" },
  ],
  naturaleventcategory: [
    { property: "id", label: "ID", isId: true },
    { property: "label", label: "Label" },
    { property: "description", label: "Description" },
  ],
  reagentcategory: [
    { property: "id", label: "ID", isId: true },
    { property: "label", label: "Label" },
    { property: "description", label: "Description" },
  ],
};

export const ReturnColumnBuilder = ({
  nodes,
  existingColumns,
  isOpen,
  onClose,
  onSave,
}: ReturnColumnBuilderProps) => {
  const [columns, setColumns] = useState<ReturnColumn[]>(
    existingColumns.length > 0
      ? existingColumns
      : [{ nodeId: "", property: "", alias: "" }]
  );

  const addColumn = () => {
    setColumns([
      ...columns,
      { nodeId: "", property: "", alias: "" },
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
    const newColumns = [...columns];

    if (field === "nodeId") {
      // When changing node, reset property
      newColumns[index] = {
        ...newColumns[index],
        nodeId: value,
        property: "",
        alias: "",
      };
    } else {
      newColumns[index] = {
        ...newColumns[index],
        [field]: value,
      };
    }

    setColumns(newColumns);
  };

  const getPropertiesForNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return [];

    const nodeType = node.type || "unknown";
    return NODE_PROPERTIES[nodeType] || [];
  };

  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return nodeId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeData = node.data as any;
    return nodeData?.ageName || nodeData?.label || nodeData?.identifier || nodeId;
  };

  const handleSave = () => {
    // Filter out incomplete columns
    const validColumns = columns.filter(
      (c) => c.nodeId && c.property
    );
    onSave(validColumns);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Define Return Columns</DialogTitle>
          <DialogDescription>
            Select which node properties to return in the query results.
            These will become columns in your table view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {columns.map((column, index) => (
            <div key={index} className="flex items-end gap-2 border-b pb-4">
              <div className="flex-1 space-y-2">
                <Label>Node</Label>
                <Select
                  value={column.nodeId}
                  onValueChange={(value) =>
                    updateColumn(index, "nodeId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {getNodeLabel(node.id)} ({node.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Property</Label>
                <Select
                  value={column.property}
                  onValueChange={(value) =>
                    updateColumn(index, "property", value)
                  }
                  disabled={!column.nodeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPropertiesForNode(column.nodeId).map((prop) => (
                      <SelectItem key={prop.property} value={prop.property}>
                        {prop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Alias (Optional)</Label>
                <Input
                  value={column.alias || ""}
                  onChange={(e) =>
                    updateColumn(index, "alias", e.target.value)
                  }
                  placeholder="Column name"
                  disabled={!column.property}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeColumn(index)}
                disabled={columns.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            onClick={addColumn}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Columns</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
