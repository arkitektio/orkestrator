import { Card } from "@/core/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { ActionDescription } from "@/core/lib/ports/ActionDescription";
import { ActionScope, ListActionFragment } from "@/rekuest/api/graphql";
import clsx from "clsx";
import { TemplateSelector } from "./TemplateSelector";

/**
 * Rekuest actions as pickable chips. Stateful actions open a template picker
 * (the chosen implementation is passed through as `templateId`).
 */
export const ActionSuggestions = (props: {
  actions: readonly ListActionFragment[];
  error?: { message: string } | null;
  onPick: (actionId: string, templateId?: string) => void;
}) => (
  <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
    {props.error && <div className="text-red-500">Error: {props.error.message}</div>}
    {props.actions.map((action) => (
      <Tooltip key={action.id}>
        <TooltipTrigger asChild>
          {action.stateful ? (
            <Popover>
              <PopoverTrigger asChild>
                <Card className="px-2 py-1 border-solid border-2 border-green-300 cursor-pointer">
                  {action.name}
                </Card>
              </PopoverTrigger>
              <PopoverContent className="rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">
                  This is a stateful node and needs to be bound to a specific instance
                </div>
                <TemplateSelector
                  hash={action.hash}
                  node={action.id}
                  onClick={(node, template) => props.onPick(node, template)}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Card
              onClick={() => props.onPick(action.id)}
              className={clsx(
                "px-2 py-1 border cursor-pointer",
                action.scope == ActionScope.Global ? "" : "dark:border-blue-200",
              )}
            >
              {action.name}
            </Card>
          )}
        </TooltipTrigger>
        <TooltipContent align="center">
          {action.description && <ActionDescription description={action.description} />}
          {action.scope != ActionScope.Global && (
            <div className="text-blue-200 mt-2">This Node will bind this workflow to specific apps</div>
          )}
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
);
