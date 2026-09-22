import { Button, ButtonProps } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ActionSlotMode, PageActionPolicy } from "@/components/layout/actionPlan";
import { cn } from "@/lib/utils";
import React, { createContext, isValidElement, useContext } from "react";

export type { ActionSlotMode, CollapseMode, PageActionPolicy } from "@/components/layout/actionPlan";

/**
 * The form the surrounding action row has room for. An action reads it and
 * draws itself accordingly; it never decides on its own, so the row can plan
 * the whole set before anything is painted.
 */
const ActionSlotContext = createContext<ActionSlotMode>("row");

export const useActionSlotMode = () => useContext(ActionSlotContext);

export const ActionSlotModeProvider = ({
  mode,
  children,
}: {
  mode: ActionSlotMode;
  children: React.ReactNode;
}) => <ActionSlotContext.Provider value={mode}>{children}</ActionSlotContext.Provider>;

/** The policy an action carries when it declares none. */
export const DEFAULT_POLICY: Required<PageActionPolicy> = {
  alwaysShow: false,
  priority: 0,
  collapse: "menu",
};

/**
 * Reads an action's collapse policy off its props.
 *
 * Deliberately structural rather than tied to `PageAction`: a plain `<Button>`
 * in an action row is a valid action with the default policy, and any
 * component that accepts these props can declare its own.
 */
export const readActionPolicy = (node: React.ReactNode): Required<PageActionPolicy> => {
  const props = (isValidElement(node) ? node.props : null) as PageActionPolicy | null;
  return {
    alwaysShow: props?.alwaysShow ?? DEFAULT_POLICY.alwaysShow,
    priority: props?.priority ?? DEFAULT_POLICY.priority,
    collapse: props?.collapse ?? DEFAULT_POLICY.collapse,
  };
};

/** Classes that make an action fill a menu row rather than sit in a line. */
const MENU_CLASS = "w-full justify-start";

export type PageActionProps = ButtonProps &
  PageActionPolicy & {
    /**
     * Kept apart from `children` so the icon-only form is derivable without
     * digging through the label.
     */
    icon?: React.ReactNode;
    /** Label for the burger row and the icon tooltip; defaults to `children`. */
    menuLabel?: React.ReactNode;
  };

/**
 * Merges an action's icon into the element `asChild` hands the Button.
 *
 * With `asChild` the Button renders a `Slot`, which takes exactly one element
 * child -- the icon cannot sit beside it, so it has to move inside it. A
 * `label` of `null` empties the child, which is how the icon-only form keeps
 * the link and drops its words.
 */
const mergeIntoChild = (
  children: React.ReactNode,
  icon: React.ReactNode,
  label?: React.ReactNode,
) => {
  const child = React.Children.only(children) as React.ReactElement<{
    children?: React.ReactNode;
  }>;
  const inner = label === undefined ? child.props.children : label;
  return React.cloneElement(child, undefined, icon, inner);
};

/**
 * A page-chrome action: a `Button` that also knows what to give up when the
 * action row is short of space.
 *
 * ```tsx
 * <PageAction alwaysShow icon={<Plus />} onClick={create}>New</PageAction>
 * <PageAction priority={-10} collapse="icon" icon={<ArrowUpDown />}>Sort</PageAction>
 * ```
 *
 * The policy props are read by the row off the element, so they never reach
 * the DOM.
 */
export const PageAction = ({
  alwaysShow: _alwaysShow,
  priority: _priority,
  collapse: _collapse,
  icon,
  menuLabel,
  children,
  className,
  asChild,
  variant = "outline",
  size = "default",
  ...props
}: PageActionProps) => {
  const mode = useActionSlotMode();
  const label = menuLabel ?? children;

  if (mode === "hidden") return null;

  if (mode === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild={asChild}
            variant={variant}
            size="icon"
            aria-label={props["aria-label"] ?? (typeof label === "string" ? label : undefined)}
            className={className}
            {...props}
          >
            {asChild
              ? mergeIntoChild(children, icon, icon ? null : undefined)
              : (icon ?? children)}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  if (mode === "menu") {
    return (
      <Button
        asChild={asChild}
        variant="ghost"
        size={size}
        className={cn(MENU_CLASS, className)}
        {...props}
      >
        {asChild ? (
          mergeIntoChild(children, icon, menuLabel)
        ) : (
          <>
            {icon}
            {label}
          </>
        )}
      </Button>
    );
  }

  return (
    <Button asChild={asChild} variant={variant} size={size} className={className} {...props}>
      {asChild ? (
        mergeIntoChild(children, icon)
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  );
};

/**
 * The part of a control that goes when the row is down to icons — its label,
 * its badge, its caret.
 *
 * It is how a control that is not a `PageAction` (a filter's popover trigger,
 * a dropdown's) earns an icon-only form: keep the glyph outside, put the words
 * in here, and the same markup serves the row, the burger and the narrow row
 * in between.
 */
export const ActionLabel = ({ children }: { children: React.ReactNode }) => {
  const mode = useActionSlotMode();
  if (mode === "icon") return null;
  return <>{children}</>;
};

/** The Button `size` a control should use in the slot it is drawn in. */
export const useActionSlotSize = (size: ButtonProps["size"] = "default") =>
  useActionSlotMode() === "icon" ? "icon" : size;

/**
 * A Button for controls the row cannot render itself — the trigger of a
 * dropdown or a popover. It follows the slot's size, so wrapping the control
 * in a `PageAction.Slot` with `collapse: "icon"` and putting the words in an
 * `ActionLabel` is all an existing trigger needs to earn an icon-only form.
 */
export const ActionTrigger = ({
  variant = "outline",
  size,
  className,
  ...props
}: ButtonProps) => {
  const slotSize = useActionSlotSize(size);
  return (
    <Button variant={variant} size={slotSize} className={cn("gap-2", className)} {...props} />
  );
};

export type PageActionSlotProps = PageActionPolicy & {
  children: React.ReactNode;
  /**
   * Shown in place of the child once the row is down to icons: the child moves
   * into a popover behind this glyph. Without one the child is handed the mode
   * and is expected to shrink itself (`useActionSlotMode`).
   */
  icon?: React.ReactNode;
  /** Accessible name of that popover trigger. */
  label?: string;
  className?: string;
};

/**
 * Applies a collapse policy to something that is not a `PageAction` — a filter
 * bar, a search field, a dropdown.
 *
 * The child is rendered as it is, so it behaves the same in the row and in the
 * burger; only the icon form substitutes a trigger for it.
 */
const PageActionSlot = ({
  alwaysShow: _alwaysShow,
  priority: _priority,
  collapse: _collapse,
  icon,
  label,
  className,
  children,
}: PageActionSlotProps) => {
  const mode = useActionSlotMode();

  if (mode === "hidden") return null;

  if (mode === "icon" && icon) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label={label} title={label}>
            {icon}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          {children}
        </PopoverContent>
      </Popover>
    );
  }

  return <div className={cn("flex items-center gap-1", className)}>{children}</div>;
};

PageAction.Slot = PageActionSlot;

export type PageActionGroupProps = PageActionPolicy & {
  children: React.ReactNode;
  className?: string;
};

/**
 * Actions that belong together and must collapse together — the row measures
 * and degrades the group as one item.
 *
 * Use it only where the set is genuinely one control (a page's sibling views);
 * actions that merely sit next to each other should be siblings, so each can
 * give way on its own.
 */
export const PageActionGroup = ({
  alwaysShow: _alwaysShow,
  priority: _priority,
  collapse: _collapse,
  className,
  children,
}: PageActionGroupProps) => {
  const mode = useActionSlotMode();

  if (mode === "hidden") return null;

  return (
    <div
      className={cn(
        mode === "menu" ? "flex flex-col items-stretch gap-1" : "flex flex-row items-center gap-1",
        className,
      )}
    >
      {children}
    </div>
  );
};
