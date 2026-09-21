import { CommandItem } from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import React, { createElement } from "react";

export const CommandActionIcon = (props: {
  icon?: React.ComponentType<{ className?: string }> | null;
  svg?: string | null;
  className?: string;
}) => {
  if (props.svg) {
    return (
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4 [&_svg]:fill-current [&_svg]:stroke-current",
          props.className,
        )}
        dangerouslySetInnerHTML={{ __html: props.svg }}
      />
    );
  }

  const Icon = props.icon ?? Sparkles;

  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground",
        props.className,
      )}
    >
      {createElement(Icon, { className: "h-4 w-4" })}
    </span>
  );
};

export const CommandActionContent = (props: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | null;
  svg?: string | null;
  trailing?: React.ReactNode;
}) => {
  const tooltipContent = props.description ?? props.title;

  return (
    <Tooltip>
      <TooltipTrigger className="flex w-full items-center gap-3 text-left">
        <CommandActionIcon icon={props.icon} svg={props.svg} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="mr-auto flex text-md text-foreground">
            {props.title}
          </span>
          {props.description ? (
            <span className="mr-auto text-xs text-muted-foreground">
              {props.description}
            </span>
          ) : null}
        </span>
        {props.trailing}
      </TooltipTrigger>
      <TooltipContent>{tooltipContent}</TooltipContent>
    </Tooltip>
  );
};

export const CommandActionRow = (props: {
  value?: string;
  onSelect?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | null;
  svg?: string | null;
  trailing?: React.ReactNode;
  progress?: number | null;
  className?: string;
  disabled?: boolean;
  /** A right-click on the row (the shared "Run on" picker hooks in here). */
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
}) => {
  return (
    <CommandItem
      value={props.value}
      onSelect={props.onSelect}
      onContextMenu={props.onContextMenu}
      className={cn("flex items-center gap-3", props.className)}
      style={{
        backgroundSize: `${props.progress || 0}% 100%`,
        backgroundImage: `linear-gradient(to right, #10b981 ${props.progress}%, #10b981 ${props.progress}%)`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
      }}
      disabled={props.disabled}
    >
      <CommandActionContent
        title={props.title}
        description={props.description}
        icon={props.icon}
        svg={props.svg}
        trailing={props.trailing}
      />
    </CommandItem>
  );
};
