import React from "react";

import { CommandGroup, CommandItem } from "@/core/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { useCompactRows } from "../rowPin";
import type { SkinGroupProps, SkinRowProps, SmartMenuSkin } from "../skin";
import { CommandActionIcon, FLASH_CLASS, RowPinToggle, progressStyle } from "./parts";

/**
 * The menu as it always looked: one row per action under its section's
 * heading, tighter in the smart menu (`CompactRowsProvider`) than in the ⌘K
 * palette. The default skin.
 */

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

/** A failed run, said at the row's right end. */
const FailureNote = ({ failure }: { failure: NonNullable<SkinRowProps["failure"]> }) => (
  <span className="max-w-48 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-right text-[10px] leading-tight text-destructive">
    <span className="block font-medium">{failure.title}</span>
    {failure.detail ? <span className="block truncate">{failure.detail}</span> : null}
  </span>
);

/** Cannot run right now: a quiet tag, the reason on hover of the row. */
const UnavailableTag = () => (
  <span className="shrink-0 rounded border border-border/60 px-1 text-[10px] leading-4 text-muted-foreground">
    offline
  </span>
);

const ListRow = (props: SkinRowProps) => {
  const compact = useCompactRows();
  const { pin } = props;
  const trailing =
    props.failure || props.trailing || props.unavailable ? (
      <span className="ml-auto flex items-center gap-2">
        {props.trailing}
        {props.unavailable && !props.failure ? <UnavailableTag /> : null}
        {props.failure ? <FailureNote failure={props.failure} /> : null}
      </span>
    ) : undefined;

  return (
    <CommandItem
      value={props.value}
      onSelect={props.onSelect}
      onContextMenu={props.onContextMenu}
      className={cn(
        "flex items-center",
        compact ? "gap-2 py-1" : "gap-3",
        props.running && "animate-pulse",
        props.unavailable && "opacity-60",
        props.flash && FLASH_CLASS,
        props.className,
      )}
      style={progressStyle(props.progress)}
      disabled={props.disabled}
      data-unavailable={props.unavailable ? "true" : undefined}
    >
      <CommandActionContent
        title={props.title}
        description={props.unavailable ? (
          <>
            {props.description}
            {props.description ? " · " : null}
            {props.unavailable.reason}
          </>
        ) : props.description}
        icon={props.icon}
        svg={props.svg}
        trailing={trailing}
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

export const SectionHeading = ({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => {
  const compact = useCompactRows();
  return (
    <span
      className={cn(
        "w-full items-center ml-2 inline-flex",
        compact
          ? "gap-1 pt-1 text-[10px] leading-none text-muted-foreground"
          : "gap-2 text-xs font-light",
      )}
    >
      {Icon ? <Icon className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} /> : null}
      <span>{children}</span>
    </span>
  );
};

const ListGroup = ({ heading, icon, children }: SkinGroupProps) => (
  <CommandGroup heading={<SectionHeading icon={icon}>{heading}</SectionHeading>}>
    {children}
  </CommandGroup>
);

export const LIST_SKIN: SmartMenuSkin = { Row: ListRow, Group: ListGroup };
