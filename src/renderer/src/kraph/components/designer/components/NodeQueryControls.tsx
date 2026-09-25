import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { ArrowDownToLine, Filter, Plus, X } from "lucide-react";
import { useState } from "react";
import { useIsNodeInPath, useReturnColumnManager, useWhereClauseManager, WhereCondition } from "../OntologyGraphProvider";

// Node property configurations
const NODE_PROPERTIES: Record<string, Array<{ name: string; type: 'string' | 'number' | 'boolean' }>> = {
    Entity: [
        { name: "label", type: "string" },
        { name: "ageName", type: "string" },
        { name: "description", type: "string" },
    ],
    Structure: [
        { name: "label", type: "string" },
        { name: "ageName", type: "string" },
        { name: "kind", type: "string" },
    ],
    Metric: [
        { name: "label", type: "string" },
        { name: "ageName", type: "string" },
        { name: "value", type: "number" },
    ],
    default: [
        { name: "label", type: "string" },
        { name: "ageName", type: "string" },
    ],
};

interface NodeQueryControlsProps {
    nodeId: string;
    nodeType: string; // "Entity", "Structure", "Metric", etc.
}

export const NodeQueryControls: React.FC<NodeQueryControlsProps> = ({ nodeId, nodeType }) => {
    const isInPath = useIsNodeInPath(nodeId);
    const { conditions, setConditions, hasConditions } = useWhereClauseManager(nodeId);
    const { columns, addColumn, removeColumn, hasColumns } = useReturnColumnManager(nodeId);

    const [showWhereEditor, setShowWhereEditor] = useState(false);
    const [showReturnEditor, setShowReturnEditor] = useState(false);
    const [editingConditions, setEditingConditions] = useState<WhereCondition[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<string>("");

    // Only show controls if node is in a path
    if (!isInPath) return null;

    const properties = NODE_PROPERTIES[nodeType] || NODE_PROPERTIES.default;

    const handleWhereClick = () => {
        setEditingConditions(conditions.length > 0 ? conditions : [{ property: "", operator: "=", value: "" }]);
        setShowWhereEditor(!showWhereEditor);
        setShowReturnEditor(false);
    };

    const handleReturnClick = () => {
        setShowReturnEditor(!showReturnEditor);
        setShowWhereEditor(false);
    };

    const saveWhereConditions = () => {
        const validConditions = editingConditions.filter(
            c => c.property && c.operator && c.value
        );
        setConditions(validConditions);
        setShowWhereEditor(false);
    };

    const addCondition = () => {
        setEditingConditions([...editingConditions, { property: "", operator: "=", value: "" }]);
    };

    const removeCondition = (index: number) => {
        setEditingConditions(editingConditions.filter((_, i) => i !== index));
    };

    const updateCondition = (index: number, field: keyof WhereCondition, value: string) => {
        const updated = [...editingConditions];
        updated[index] = { ...updated[index], [field]: value };
        setEditingConditions(updated);
    };

    const getOperatorsForProperty = (propertyName: string) => {
        const prop = properties.find(p => p.name === propertyName);
        if (!prop) return ["=", "!="];

        if (prop.type === "string") {
            return ["=", "!=", "CONTAINS", "STARTS WITH", "ENDS WITH"];
        } else if (prop.type === "number") {
            return ["=", "!=", "<", ">", "<=", ">="];
        } else if (prop.type === "boolean") {
            return ["=", "!="];
        }
        return ["=", "!="];
    };

    const handleAddReturnColumn = () => {
        if (selectedProperty) {
            addColumn(selectedProperty);
            setSelectedProperty("");
        }
    };

    return (
        <div className="absolute bottom-2 left-2 right-2 z-20 space-y-2" onClick={(e) => e.stopPropagation()}>
            {/* Control Buttons */}
            <div className="flex gap-1 justify-center">
                <Button
                    size="sm"
                    variant={hasConditions ? "default" : "secondary"}
                    className="h-6 px-2 text-xs shadow-lg"
                    onClick={handleWhereClick}
                >
                    <Filter className="h-3 w-3 mr-1" />
                    {hasConditions ? conditions.length : "WHERE"}
                </Button>
                <Button
                    size="sm"
                    variant={hasColumns ? "default" : "secondary"}
                    className="h-6 px-2 text-xs shadow-lg"
                    onClick={handleReturnClick}
                >
                    <ArrowDownToLine className="h-3 w-3 mr-1" />
                    {hasColumns ? columns.length : "RETURN"}
                </Button>
            </div>

            {/* WHERE Editor */}
            {showWhereEditor && (
                <div className="bg-background border rounded-lg p-2 shadow-xl space-y-2">
                    <div className="text-xs font-semibold">WHERE Filters</div>

                    {editingConditions.map((condition, index) => (
                        <div key={index} className="flex items-center gap-1">
                            <Select
                                value={condition.property}
                                onValueChange={(value) => updateCondition(index, "property", value)}
                            >
                                <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue placeholder="Property" />
                                </SelectTrigger>
                                <SelectContent>
                                    {properties.map((prop) => (
                                        <SelectItem key={prop.name} value={prop.name}>
                                            {prop.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={condition.operator}
                                onValueChange={(value) => updateCondition(index, "operator", value)}
                            >
                                <SelectTrigger className="h-7 text-xs w-24">
                                    <SelectValue placeholder="Op" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getOperatorsForProperty(condition.property).map((op) => (
                                        <SelectItem key={op} value={op}>
                                            {op}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Input
                                className="h-7 text-xs flex-1"
                                placeholder="Value"
                                value={String(condition.value)}
                                onChange={(e) => updateCondition(index, "value", e.target.value)}
                            />

                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => removeCondition(index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}

                    <div className="flex items-center justify-between pt-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={addCondition}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                        </Button>

                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => setShowWhereEditor(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="h-6 text-xs"
                                onClick={saveWhereConditions}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* RETURN Editor */}
            {showReturnEditor && (
                <div className="bg-background border rounded-lg p-2 shadow-xl space-y-2">
                    <div className="text-xs font-semibold">Return Columns</div>

                    {/* Existing columns */}
                    {columns.map((col) => (
                        <div key={col.property} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex-1">{col.property}</span>
                            {col.alias && <span className="text-muted-foreground">as {col.alias}</span>}
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => removeColumn(col.property)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}

                    {/* Add new column */}
                    <div className="flex items-center gap-1 pt-1">
                        <Select
                            value={selectedProperty}
                            onValueChange={setSelectedProperty}
                        >
                            <SelectTrigger className="h-7 text-xs flex-1">
                                <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.map((prop) => (
                                    <SelectItem key={prop.name} value={prop.name}>
                                        {prop.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleAddReturnColumn}
                            disabled={!selectedProperty}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs w-full"
                        onClick={() => setShowReturnEditor(false)}
                    >
                        Close
                    </Button>
                </div>
            )}
        </div>
    );
};
