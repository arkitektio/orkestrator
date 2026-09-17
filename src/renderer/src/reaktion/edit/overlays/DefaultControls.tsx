import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CircleHelp, Redo2, Tags, Undo2 } from "lucide-react";
import React from "react";
import { useEditFlowStore, useEditTemporal } from "../context";

const ControlButton = ({
  label,
  active,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; active?: boolean }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={active}
        className={cn(active && "bg-accent text-primary")}
        {...props}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

/** Undo/redo and the canvas display toggles; sits in the editor's bottom-right dock. */
export const DefaultControls = () => {
  const { undo, redo, canUndo, canRedo } = useEditTemporal();
  const setShowEdgeLabels = useEditFlowStore((s) => s.setShowEdgeLabels);
  const setShowNodeErrors = useEditFlowStore((s) => s.setShowNodeErrors);
  const showEdgeLabels = useEditFlowStore((s) => s.showEdgeLabels);
  const showNodeErrors = useEditFlowStore((s) => s.showNodeErrors);

  return (
    <div className="flex h-9 items-center gap-0.5 rounded-lg border bg-card px-1 shadow-sm">
      <ControlButton label="Undo" onClick={() => undo()} disabled={!canUndo}>
        <Undo2 />
      </ControlButton>
      <ControlButton label="Redo" onClick={() => redo()} disabled={!canRedo}>
        <Redo2 />
      </ControlButton>
      <Separator orientation="vertical" className="mx-1 my-auto h-4" />
      <ControlButton
        label={showEdgeLabels ? "Hide edge labels" : "Show edge labels"}
        active={showEdgeLabels}
        onClick={() => setShowEdgeLabels(!showEdgeLabels)}
      >
        <Tags />
      </ControlButton>
      <ControlButton
        label={showNodeErrors ? "Hide node errors" : "Show node errors"}
        active={showNodeErrors}
        onClick={() => setShowNodeErrors(!showNodeErrors)}
      >
        <CircleHelp />
      </ControlButton>
    </div>
  );
};
