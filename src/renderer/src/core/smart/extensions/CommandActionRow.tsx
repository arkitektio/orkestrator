import { CommandItem } from "@/core/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { Pin, Sparkles } from "lucide-react";
import React, { createElement } from "react";
import { useCompactRows, useRowPin, type RowPin } from "./rowPin";

export const CommandActionIcon = (props: {
  icon?: React.ComponentType<{ className?: string }> | null;
  svg?: string | null;
  className?: string;
}) => {
  const compact = useCompactRows();
  if (props.svg) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground [&_svg]:fill-current [&_svg]:stroke-current",
          compact ? "h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5" : "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
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
        "flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground",
        compact ? "h-6 w-6" : "h-8 w-8",
        props.className,
      )}
    >
      {createElement(Icon, { className: compact ? "h-3.5 w-3.5" : "h-4 w-4" })}
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
  const compact = useCompactRows();

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn("flex w-full items-center text-left", compact ? "gap-2" : "gap-3")}
      >
        <CommandActionIcon icon={props.icon} svg={props.svg} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn("mr-auto flex text-foreground", compact ? "text-xs" : "text-md")}
          >
            {props.title}
          </span>
          {props.description ? (
            <span
              className={cn(
                "mr-auto text-muted-foreground",
                compact ? "line-clamp-1 text-[11px] leading-tight" : "text-xs",
              )}
            >
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

type CommandActionRowProps = {
  value?: string;
  onSelect?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | null;
  svg?: string | null;
  trailing?: React.ReactNode;
  /** `RowIconButton`s of the row's own, drawn before the pin. */
  buttons?: React.ReactNode;
  progress?: number | null;
  className?: string;
  disabled?: boolean;
  /** A right-click on the row (the shared "Run on" picker hooks in here). */
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
};

/** The run's progress, drawn as the row's own background. */
const progressStyle = (progress?: number | null): React.CSSProperties => ({
  backgroundSize: `${progress || 0}% 100%`,
  backgroundImage: `linear-gradient(to right, #10b981 ${progress}%, #10b981 ${progress}%)`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left center",
});

const pinLabel = (pin: RowPin, title: React.ReactNode) => {
  const name = typeof title === "string" ? title : "action";
  if (pin.locked) return `${name} is always pinned`;
  return pin.pinned ? `Unpin ${name}` : `Pin ${name}`;
};

/**
 * A small button at the right end of a row (the pin, a module's own). It sits
 * inside the cmdk item, so it keeps the pointer events to itself: a click on
 * it must not run the row. Shown on hover or selection unless `active`.
 */
export const RowIconButton = (props: {
  label: string;
  onClick: () => void;
  active?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={props.label}
    aria-pressed={props.pressed}
    title={props.label}
    disabled={props.disabled}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      props.onClick();
    }}
    className={cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 disabled:hover:bg-transparent",
      props.active
        ? "text-foreground opacity-100"
        : "opacity-0 group-hover/command-item:opacity-100 group-data-[selected=true]/command-item:opacity-100",
      props.className,
    )}
  >
    {props.children}
  </button>
);

const RowPinToggle = ({ pin, title }: { pin: RowPin; title: React.ReactNode }) => (
  <RowIconButton
    label={pinLabel(pin, title)}
    onClick={pin.toggle}
    active={pin.pinned}
    pressed={pin.pinned}
    disabled={pin.locked}
    className={cn(pin.locked && "opacity-50")}
  >
    <Pin className="h-3.5 w-3.5" fill={pin.pinned ? "currentColor" : "none"} />
  </RowIconButton>
);

export const CommandActionRow = (props: CommandActionRowProps) => {
  const pin = useRowPin();
  const compact = useCompactRows();

  return (
    <CommandItem
      value={props.value}
      onSelect={props.onSelect}
      onContextMenu={props.onContextMenu}
      className={cn("flex items-center", compact ? "gap-2 py-1" : "gap-3", props.className)}
      style={progressStyle(props.progress)}
      disabled={props.disabled}
    >
      <CommandActionContent
        title={props.title}
        description={props.description}
        icon={props.icon}
        svg={props.svg}
        trailing={props.trailing}
      />
      {props.buttons || pin ? (
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {props.buttons}
          {pin ? <RowPinToggle pin={pin} title={props.title} /> : null}
        </span>
      ) : null}
    </CommandItem>
  );
};
