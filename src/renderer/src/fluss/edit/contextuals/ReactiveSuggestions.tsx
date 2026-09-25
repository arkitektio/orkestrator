import { Card } from "@/core/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { FlowNode, ReactiveNodeSuggestions } from "@/fluss/types";
import clsx from "clsx";

export const ReactiveSuggestions = (props: {
  suggestions: readonly ReactiveNodeSuggestions[];
  onPick: (node: FlowNode) => void;
  dashed?: boolean;
}) => (
  <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
    {props.suggestions.map((sug) => (
      <Tooltip key={sug.node.id}>
        <TooltipTrigger asChild>
          <Card
            onClick={() => props.onPick(sug.node as FlowNode)}
            className={clsx(
              "px-2 py-1 border-2 border-accent cursor-pointer",
              props.dashed ? "border-dashed" : "border-solid",
            )}
          >
            {sug.title}
          </Card>
        </TooltipTrigger>
        <TooltipContent align="center">{sug.description}</TooltipContent>
      </Tooltip>
    ))}
  </div>
);
