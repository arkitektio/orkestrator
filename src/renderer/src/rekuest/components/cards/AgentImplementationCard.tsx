import React from "react";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { RekuestImplementation } from "@/core/linkers";
import { ListImplementationFragment } from "@/rekuest/api/graphql";
import { ActionLogo } from "@/rekuest/components/logo/ActionLogo";
import { Play, PlayCircle, SquarePlay } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  item: ListImplementationFragment;
}

const AgentImplementationCard = ({ item }: Props) => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  // The action's own interface for starting a run: offered next to the plain form, on a page of its own.
  const custom = item.action.assignBloks.length > 0;

  // "Play": the plain generated form, whatever interface the action brings.
  const onRun = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      openDialog("assign", { target: { implementation: item.id }, bloks: false });
    },
    [item.id, openDialog],
  );

  const onCustomRun = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`${RekuestImplementation.linkBuilder(item.id)}/assign`);
    },
    [item.id, navigate],
  );

  return (
    <RekuestImplementation.Smart object={item} hover>
      <div
        onClick={onRun}
        className={cn(
          "group flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer bg-card border-border",
          "hover:bg-accent hover:border-accent-foreground/20 transition-colors",
        )}
      >
        {/* Its logo, when the action brings one, in the run icon's place. */}
        {item.action.logo ? (
          <ActionLogo action={item.action} className="h-4 w-4" />
        ) : (
          <PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-none truncate">
            {item.action.name}
          </p>
          {item.action.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.action.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {custom && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Run ${item.action.name} with its own interface`}
                  onClick={onCustomRun}
                >
                  <SquarePlay className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Custom play: its own interface, on a page</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`Run ${item.action.name}`}
                onClick={onRun}
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Play</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </RekuestImplementation.Smart>
  );
};

export default React.memo(AgentImplementationCard);
