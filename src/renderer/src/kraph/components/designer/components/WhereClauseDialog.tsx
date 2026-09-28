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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { WhereCondition } from "../OntologyGraphProvider";

// Helper to convert RGB array to CSS rgb() string
const rgbToCSS = (rgb: number[]): string => {
    const r = Math.round(rgb[0] * 255);
    const g = Math.round(rgb[1] * 255);
    const b = Math.round(rgb[2] * 255);
    return `rgb(${r}, ${g}, ${b})`;
};

interface WhereClauseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeLabel: string;
    pathColor?: number[];
    initialConditions: WhereCondition[];
    nodeProperties: Array<{ name: string; type: "string" | "number" | "boolean" }>;
    onSave: (conditions: WhereCondition[]) => void;
}

export const WhereClauseDialog = ({
    open,
    onOpenChange,
    nodeLabel,
    pathColor,
    initialConditions,
    nodeProperties,
    onSave,
}: WhereClauseDialogProps) => {
    const [conditions, setConditions] = useState<WhereCondition[]>(
        initialConditions.length > 0
            ? initialConditions
            : [{ property: "", operator: "=", value: "" }]
    );

    const addCondition = () => {
        setConditions([...conditions, { property: "", operator: "=", value: "" }]);
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    const updateCondition = (
        index: number,
        field: keyof WhereCondition,
        value: string
    ) => {
        const updated = [...conditions];
        updated[index] = { ...updated[index], [field]: value };
        setConditions(updated);
    };

    const getOperatorsForProperty = (propertyName: string) => {
        const prop = nodeProperties.find((p) => p.name === propertyName);
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

    const handleSave = () => {
        // Filter out empty conditions
        const validConditions = conditions.filter(
            (c) => c.property && c.operator && c.value
        );
        onSave(validConditions);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {pathColor && (
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: rgbToCSS(pathColor) }}
                            />
                        )}
                        WHERE Filters for {nodeLabel}
                    </DialogTitle>
                    <DialogDescription>
                        Add conditions to filter this node in the query
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {conditions.map((condition, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                            <Select
                                value={condition.property}
                                onValueChange={(value) => updateCondition(index, "property", value)}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select property" />
                                </SelectTrigger>
                                <SelectContent>
                                    {nodeProperties.map((prop) => (
                                        <SelectItem key={prop.name} value={prop.name}>
                                            {prop.name} ({prop.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={condition.operator}
                                onValueChange={(value) => updateCondition(index, "operator", value)}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Operator" />
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
                                className="flex-1"
                                placeholder="Value"
                                value={String(condition.value)}
                                onChange={(e) => updateCondition(index, "value", e.target.value)}
                            />

                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeCondition(index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={addCondition}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Condition
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Filters
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
