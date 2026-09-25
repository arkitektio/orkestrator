import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Card } from "@/core/components/ui/card";
import { CornerDownRight, Filter } from "lucide-react";
import { ReactNode, useState } from "react";
import { useIsNodePossible, useNodeOccurrences, useNodePaths, useOntologyGraph } from "../OntologyGraphProvider";
import { ReturnDialog } from "./ReturnDialog";
import { WhereClauseDialog } from "./WhereClauseDialog";

interface PathNodePresentationProps {
  id: string;
  label: string;
  tags?: Array<{ value: string }>;
  className?: string;
  children?: ReactNode;
  /** Show multi-path indicator */
  showPathCount?: boolean;
}

// Helper to convert RGB array to CSS rgb() string
const rgbToCSS = (rgb: number[]): string => {
  const r = Math.round(rgb[0] * 255);
  const g = Math.round(rgb[1] * 255);
  const b = Math.round(rgb[2] * 255);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Shared presentation component for path builder nodes.
 * Handles coloring, styling, and visual feedback based on path membership and selectability.
 */
export const PathNodePresentation = ({
  id,
  label,
  tags = [],
  className = "",
  children,
  showPathCount = true,
}: PathNodePresentationProps) => {
  const isPossible = useIsNodePossible(id);
  const nodePaths = useNodePaths(id);
  const nodeOccurrences = useNodeOccurrences(id);
  const isInPath = nodePaths.length > 0;

  const {
    getPathWhereConditions,
    setPathWhereConditions,
    getNodeProperties,
    markedPaths,
    getNodeReturnColumns,
    addReturnColumn,
    removeReturnColumn,
  } = useOntologyGraph();

  const [whereDialogState, setWhereDialogState] = useState<{
    open: boolean;
    pathIndex: number;
    pathColor?: number[];
  } | null>(null);

  const [returnDialogState, setReturnDialogState] = useState<{
    open: boolean;
    nodeId: string;
    nodeLabel: string;
    pathIndex: number;
    pathColor?: number[];
  } | null>(null);

  // Create border image for multiple paths with radial gradient
  const borderImage = nodePaths.length > 1
    ? `conic-gradient(${nodePaths.map((path, idx) => {
      const step = 100 / nodePaths.length;
      const start = idx * step;
      const end = (idx + 1) * step;
      const colorCSS = path.color ? rgbToCSS(path.color) : 'rgb(100, 100, 100)';
      return `${colorCSS} ${start}%, ${colorCSS} ${end}%`;
    }).join(', ')})`
    : undefined;

  // Use the first path's color if node is in a single path
  const pathColor = isInPath && nodePaths.length === 1 ? nodePaths[0].color : undefined;

  // Border color: path color for single path, transparent for multiple (using border-image instead)
  const borderColorCSS = nodePaths.length > 1 ? 'transparent' : (pathColor ? rgbToCSS(pathColor) : 'rgba(100, 100, 100, 0.3)');

  // Create lighter glow effect
  const glowColor = pathColor
    ? rgbToCSS(pathColor).replace('rgb', 'rgba').replace(')', ', 0.3)')
    : undefined;

  const nodeProperties = getNodeProperties?.(id) || [];

  const openWhereDialog = (pathIndex: number, pathColor?: number[]) => {
    setWhereDialogState({ open: true, pathIndex, pathColor });
  };

  const handleSaveWhereConditions = (conditions: import("../OntologyGraphProvider").WhereCondition[]) => {
    if (whereDialogState) {
      setPathWhereConditions?.(whereDialogState.pathIndex, id, conditions);
    }
  };

  const openReturnDialog = (pathIndex: number, pathColor?: number[]) => {
    setReturnDialogState({
      open: true,
      nodeId: id,
      nodeLabel: label,
      pathIndex,
      pathColor,
    });
  };

  const handleSaveReturnColumns = (columns: import("../OntologyGraphProvider").ReturnColumn[]) => {
    // Remove existing columns for this node
    const existingColumns = getNodeReturnColumns?.(id) || [];
    existingColumns.forEach((col) => {
      removeReturnColumn?.(id, col.property);
    });

    // Add new columns
    columns.forEach((col) => {
      addReturnColumn?.(col);
    });
  };

  return (
    <>
      <Card
        className={`h-full w-full relative group transition-all duration-300 flex items-center justify-center p-3 ${className}`}
        style={{
          opacity: isPossible || isInPath ? 1 : 0.2,
          pointerEvents: 'auto', // Always allow pointer events so WHERE buttons are clickable
          boxShadow: isInPath && glowColor
            ? `0 0 8px 2px ${glowColor}`
            : isPossible
              ? '0 0 6px 1px rgba(59, 130, 246, 0.4)'
              : '0 0 3px 1px rgba(100, 100, 100, 0.2)',
          border: `3px solid ${borderColorCSS}`,
          borderImage: borderImage ? `${borderImage} 1` : undefined,
          borderRadius: borderImage ? '0.5rem' : undefined, // Match Card's rounded-lg
          filter: !isPossible && !isInPath ? 'grayscale(0.8)' : 'none',
          backgroundColor: 'hsl(var(--card))'
        }}
      >
        {/* Path index badges on the node */}
        {isInPath && nodeOccurrences.length > 0 && (
          <div className="absolute -top-2 -right-2 flex flex-row gap-1">
            {nodeOccurrences.map((occurrence) => {
              const path = markedPaths?.[occurrence.pathIndex];
              return (
                <Badge
                  key={`badge-${occurrence.pathIndex}-${occurrence.nodePosition}`}
                  className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full border-2 border-background"
                  style={{
                    backgroundColor: path?.color ? rgbToCSS(path.color) : undefined,
                    color: "white",
                  }}
                >
                  {occurrence.nodePosition + 1}
                </Badge>
              );
            })}
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-2 text-center w-full">
          {children || <div className="font-semibold">{label}</div>}

          {tags.length > 0 && (
            <div className="flex flex-row gap-1 flex-wrap justify-center">
              {tags.map((tag) => (
                <Badge key={tag.value} variant="outline" className="text-xs">
                  {tag.value}
                </Badge>
              ))}
            </div>
          )}

          {showPathCount && nodePaths.length > 1 && (
            <div className="text-xs text-muted-foreground">
              In {nodePaths.length} paths
            </div>
          )}

          {/* WHERE and RETURN buttons for each occurrence */}
          {isInPath && nodeOccurrences.length > 0 && (
            <div className="flex flex-col gap-1 justify-center mt-2">
              {/* WHERE buttons row */}
              <div className="flex flex-row gap-1 justify-center">
                {nodeOccurrences.map((occurrence) => {
                  const path = markedPaths?.[occurrence.pathIndex];
                  const hasConditions =
                    (getPathWhereConditions?.(occurrence.pathIndex, id)?.length ||
                      0) > 0;

                  return (
                    <Button
                      key={`where-${occurrence.pathIndex}-${occurrence.nodePosition}`}
                      size="icon"
                      variant={hasConditions ? "default" : "outline"}
                      className="h-5 w-5"
                      style={{
                        borderColor: path?.color ? rgbToCSS(path.color) : undefined,
                        ...(hasConditions && path?.color
                          ? {
                            backgroundColor: rgbToCSS(path.color),
                            color: "white",
                          }
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhereDialog(occurrence.pathIndex, path?.color);
                      }}
                      title={`WHERE filters for path ${occurrence.pathIndex + 1}${hasConditions ? ` (${getPathWhereConditions?.(occurrence.pathIndex, id)?.length} conditions)` : ""}`}
                    >
                      <Filter className="h-3 w-3" />
                    </Button>
                  );
                })}
              </div>

              {/* RETURN buttons row - one per occurrence */}
              <div className="flex flex-row gap-1 justify-center">
                {nodeOccurrences.map((occurrence) => {
                  const path = markedPaths?.[occurrence.pathIndex];
                  const hasReturnColumns =
                    (getNodeReturnColumns?.(id)?.length || 0) > 0;

                  return (
                    <Button
                      key={`return-${occurrence.pathIndex}-${occurrence.nodePosition}`}
                      size="icon"
                      variant={hasReturnColumns ? "default" : "outline"}
                      className="h-5 w-5"
                      style={{
                        borderColor: path?.color ? rgbToCSS(path.color) : undefined,
                        ...(hasReturnColumns && path?.color
                          ? {
                            backgroundColor: rgbToCSS(path.color),
                            color: "white",
                          }
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openReturnDialog(occurrence.pathIndex, path?.color);
                      }}
                      title={`Return columns for path ${occurrence.pathIndex + 1}${hasReturnColumns ? ` (${getNodeReturnColumns?.(id)?.length})` : ""}`}
                    >
                      <CornerDownRight className="h-3 w-3" />
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* WHERE clause dialog */}
      {whereDialogState && (
        <WhereClauseDialog
          open={whereDialogState.open}
          onOpenChange={(open) => !open && setWhereDialogState(null)}
          nodeLabel={label}
          pathColor={whereDialogState.pathColor}
          initialConditions={getPathWhereConditions?.(whereDialogState.pathIndex, id) || []}
          nodeProperties={nodeProperties}
          onSave={handleSaveWhereConditions}
        />
      )}

      {/* RETURN columns dialog */}
      {returnDialogState && (
        <ReturnDialog
          open={returnDialogState.open}
          onOpenChange={(open) => {
            if (!open) setReturnDialogState(null);
          }}
          nodeId={returnDialogState.nodeId}
          nodeLabel={returnDialogState.nodeLabel}
          availableProperties={nodeProperties}
          initialColumns={getNodeReturnColumns?.(id) || []}
          onSave={handleSaveReturnColumns}
          pathColor={returnDialogState.pathColor}
        />
      )}
    </>
  );
};
