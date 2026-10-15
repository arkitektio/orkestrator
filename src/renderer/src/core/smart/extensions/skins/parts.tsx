import { Pin, Sparkles } from "lucide-react";
import React, { createElement } from "react";

import { cn } from "@/core/util/utils";
import { useCompactRows, type RowPin } from "../rowPin";

/** The pieces skins draw rows from. */

export const CommandActionIcon = (props: {
  icon?: React.ComponentType<{ className?: string }> | null;
  svg?: string | null;
  leading?: React.ReactNode;
  className?: string;
}) => {
  const compact = useCompactRows();
  if (props.leading) {
    // A picture of its own (an action's logo) fills the box the icon sits in.
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md",
          compact ? "h-6 w-6" : "h-8 w-8",
          props.className,
        )}
      >
        {props.leading}
      </span>
    );
  }
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

/** The run's progress, drawn as the row's own background. */
export const progressStyle = (progress?: number | null): React.CSSProperties => ({
  backgroundSize: `${progress || 0}% 100%`,
  backgroundImage: `linear-gradient(to right, #10b981 ${progress}%, #10b981 ${progress}%)`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left center",
});

/** The look of a failure's moment, shared by the skins. */
export const FLASH_CLASS =
  "bg-destructive/10 data-[selected=true]:bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/35 transition-colors duration-150";

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

export const RowPinToggle = ({
  pin,
  title,
  className,
}: {
  pin: RowPin;
  title: React.ReactNode;
  className?: string;
}) => (
  <RowIconButton
    label={pinLabel(pin, title)}
    onClick={pin.toggle}
    active={pin.pinned}
    pressed={pin.pinned}
    disabled={pin.locked}
    className={cn(pin.locked && "opacity-50", className)}
  >
    <Pin className="h-3.5 w-3.5" fill={pin.pinned ? "currentColor" : "none"} />
  </RowIconButton>
);
