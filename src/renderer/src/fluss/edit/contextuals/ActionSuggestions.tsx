import { BlokLogo } from "@/rekuest/components/logo/BlokLogo";
import { Card } from "@/core/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
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
    {props.error && <div className="text-destructive">Error: {props.error.message}</div>}
    {props.actions.map((action) => (
      <Tooltip key={action.id}>
        <TooltipTrigger asChild>
          {action.stateful ? (
            <Popover>
              <PopoverTrigger asChild>
                <Card className="flex items-center gap-1.5 px-2 py-1 border-solid border-2 border-success/40 cursor-pointer">
                  <BlokLogo blok={action.logo} className="h-4 w-4" />
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
                "flex items-center gap-1.5 px-2 py-1 border cursor-pointer",
                action.scope == ActionScope.Global ? "" : "dark:border-info/30",
              )}
            >
              <BlokLogo blok={action.logo} className="h-4 w-4" />
              {action.name}
            </Card>
          )}
        </TooltipTrigger>
        <TooltipContent align="center">
          {action.description}
          {action.scope != ActionScope.Global && (
            <div className="text-info mt-2">This Node will bind this workflow to specific apps</div>
          )}
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
);
