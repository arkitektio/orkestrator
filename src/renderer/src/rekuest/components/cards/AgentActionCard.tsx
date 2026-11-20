import React, { useCallback } from "react";
import { AppWindow, Code, Database, Play, PlayCircle, SquarePlay } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { Name } from "@/core/ui/name";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { RekuestImplementation } from "@/core/linkers";
import { ListImplementationFragment } from "@/rekuest/api/graphql";
import { ActionMonogram } from "@/rekuest/components/logo/ActionMonogram";
import { BlokLogo } from "@/rekuest/components/logo/BlokLogo";

interface Props {
  item: ListImplementationFragment;
}

/**
 * One action of an agent, in the card frame the agent and task cards share:
 * the theme colour, the action's logo beside its name and large and faint
 * behind it, what it does in two lines, and at the foot the interface it is
 * implemented as (and whether it keeps state or brings its own way of
 * starting a run), with Play at the bottom right. The name opens the
 * implementation.
 */
const TheCard = ({ item }: Props) => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  const { action } = item;
  // The action's own interface for starting a run: offered next to the plain form, on a page of its own.
  const custom = action.assignBloks.length > 0;

  // "Play": the plain generated form, whatever interface the action brings.
  const onRun = useCallback(
    () => openDialog("assign", { target: { implementation: item.id }, bloks: false }),
    [item.id, openDialog],
  );
  const onCustomRun = useCallback(
    () => navigate(`${RekuestImplementation.linkBuilder(item.id)}/assign`),
    [item.id, navigate],
  );

  const facts: CardFact[] = [
    ...(action.stateful ? [{ icon: Database, content: "Stateful", title: "Works on the agent's state" }] : []),
    ...(custom ? [{ icon: AppWindow, content: "Own interface", title: "Brings its own way of starting a run" }] : []),
    { icon: Code, content: item.interface, title: "Interface", at: "end" },
  ];

  return (
    <RekuestImplementation.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        watermark={action.logo ? <BlokLogo blok={action.logo} /> : <PlayCircle strokeWidth={1.25} />}
        leading={
          <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-foreground/10">
            {action.logo ? (
              <BlokLogo blok={action.logo} className="size-full p-0.5" />
            ) : (
              <ActionMonogram name={action.name} className="size-full text-[8px]" />
            )}
          </span>
        }
        title={
          <RekuestImplementation.DetailLink object={item} className="block min-w-0 hover:underline">
            <Name>{action.name}</Name>
          </RekuestImplementation.DetailLink>
        }
        facts={facts}
        stacked
        footer={
          <div className="flex items-center">
            {custom && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Run ${action.name} with its own interface`}
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
                  aria-label={`Run ${action.name}`}
                  onClick={onRun}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play</TooltipContent>
            </Tooltip>
          </div>
        }
        menu
      >
        {action.description && (
          <p className="line-clamp-2 px-1 text-xs leading-snug text-muted-foreground" title={action.description}>
            {action.description}
          </p>
        )}
      </CardFrame>
    </RekuestImplementation.Smart>
  );
};

export default React.memo(TheCard);
