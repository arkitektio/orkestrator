import * as React from 'react';
import {
  AlertDialog as ShadAlertDialog,
  AlertDialogAction as ShadAlertDialogAction,
  AlertDialogCancel as ShadAlertDialogCancel,
  AlertDialogContent as ShadAlertDialogContent,
  AlertDialogDescription as ShadAlertDialogDescription,
  AlertDialogFooter as ShadAlertDialogFooter,
  AlertDialogHeader as ShadAlertDialogHeader,
  AlertDialogTitle as ShadAlertDialogTitle,
  AlertDialogTrigger as ShadAlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ContextMenu as ShadContextMenu,
  ContextMenuCheckboxItem as ShadContextMenuCheckboxItem,
  ContextMenuContent as ShadContextMenuContent,
  ContextMenuItem as ShadContextMenuItem,
  ContextMenuLabel as ShadContextMenuLabel,
  ContextMenuSeparator as ShadContextMenuSeparator,
  ContextMenuTrigger as ShadContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog as ShadDialog,
  DialogClose as ShadDialogClose,
  DialogContent as ShadDialogContent,
  DialogDescription as ShadDialogDescription,
  DialogFooter as ShadDialogFooter,
  DialogHeader as ShadDialogHeader,
  DialogTitle as ShadDialogTitle,
  DialogTrigger as ShadDialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer as ShadDrawer,
  DrawerContent as ShadDrawerContent,
  DrawerDescription as ShadDrawerDescription,
  DrawerFooter as ShadDrawerFooter,
  DrawerHeader as ShadDrawerHeader,
  DrawerTitle as ShadDrawerTitle,
  DrawerTrigger as ShadDrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu as ShadDropdownMenu,
  DropdownMenuCheckboxItem as ShadDropdownMenuCheckboxItem,
  DropdownMenuContent as ShadDropdownMenuContent,
  DropdownMenuItem as ShadDropdownMenuItem,
  DropdownMenuLabel as ShadDropdownMenuLabel,
  DropdownMenuSeparator as ShadDropdownMenuSeparator,
  DropdownMenuTrigger as ShadDropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard as ShadHoverCard,
  HoverCardContent as ShadHoverCardContent,
  HoverCardTrigger as ShadHoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Popover as ShadPopover,
  PopoverContent as ShadPopoverContent,
  PopoverTrigger as ShadPopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet as ShadSheet,
  SheetContent as ShadSheetContent,
  SheetDescription as ShadSheetDescription,
  SheetFooter as ShadSheetFooter,
  SheetHeader as ShadSheetHeader,
  SheetTitle as ShadSheetTitle,
  SheetTrigger as ShadSheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipTrigger as ShadTooltipTrigger,
} from '@/components/ui/tooltip';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useAction,
  useBlok,
  useEventAction,
  useValue,
} from '../runtime';
import {iconNameSchema, renderIcon} from './icons';
import {
  actionProp,
  alignmentSchema,
  asBoolean,
  bindSchema,
  boolSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  disabledSchema,
  renderChildList,
  renderContent,
  sideSchema,
  useControlledValue,
} from './shared';

/**
 * Overlay surfaces: dialogs, sheets, popovers, tooltips and menus.
 *
 * Each family is a Radix root plus its parts, and each part is its own blok.
 * The parts find their root through React context, which reaches them because
 * `buildChild` renders a real child element — see `shared/render.tsx`.
 *
 * The one thing this rules out is `asChild`: `BlokNode` is a memo component
 * and does not forward refs, so a Radix Slot around a child blok would fail.
 * That is why every trigger is a blok that renders the Radix trigger *itself*
 * and puts the label inside, rather than a wrapper around a Button blok.
 */

type OverlayRootComponent = React.ComponentType<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}>;

/**
 * Open/closed state follows the same rules as a form control's value: `open`
 * wins, then a `bind` path, and with neither the surface keeps its own state.
 */
const createOverlayRoot = (name: string, Root: OverlayRootComponent, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          children: childListSchema.describe('The trigger and content parts of this overlay.'),
          bind: bindSchema.describe('Data-model path holding the open state.'),
          open: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled open state.'),
          defaultOpen: boolSchema.describe('Open on mount when uncontrolled.'),
          onOpenChange: actionProp('Runs when the surface opens or closes. May read $event.'),
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      const bind = useValue(blok.bind);
      const open = useValue(blok.open);
      const defaultOpen = useValue(blok.defaultOpen);
      const onOpenChange = useEventAction(blok.onOpenChange);

      const controlled = useControlledValue<boolean>({
        bind,
        value: open,
        defaultValue: defaultOpen,
        fallback: false,
        parse: asBoolean,
      });

      return (
        <Root
          open={controlled.value}
          onOpenChange={next => {
            controlled.setValue(next);
            onOpenChange?.(next);
          }}
        >
          {renderChildList(children, buildChild)}
        </Root>
      );
    },
  );

type TriggerComponent = React.ComponentType<{
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}>;

const createTriggerBlok = (name: string, Trigger: TriggerComponent, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
          icon: iconNameSchema.describe('Icon rendered before the label.'),
          children: contentSchema,
          disabled: disabledSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const label = useValue(blok.label);
      const icon = useValue(blok.icon);
      const children = useValue(blok.children);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);

      return (
        <Trigger disabled={disabled === true} className={className}>
          {renderIcon(icon)}
          {renderContent(children ?? label, buildChild)}
        </Trigger>
      );
    },
  );

type PanelComponent = React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;

/** A part that is just "a styled box of children" — headers, footers, bodies. */
const createPanelBlok = (name: string, Panel: PanelComponent, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          children: childListSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      const className = useValue(blok.className);

      return <Panel className={className}>{renderChildList(children, buildChild)}</Panel>;
    },
  );

type TextPartComponent = React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;

/** A part that carries a single line of text — titles and descriptions. */
const createTextPartBlok = (name: string, Part: TextPartComponent, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
          children: contentSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);

      return <Part className={className}>{renderContent(children ?? text, buildChild)}</Part>;
    },
  );

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export const Dialog = createOverlayRoot('Dialog', ShadDialog, 'A modal dialog.');
export const DialogTrigger = createTriggerBlok(
  'DialogTrigger',
  ShadDialogTrigger,
  'The control that opens a Dialog.',
);
export const DialogContent = createBlokComponent(
  {
    name: 'DialogContent',
    schema: z
      .object({
        children: childListSchema,
        showCloseButton: boolSchema.describe('Show the corner close button. Defaults to true.'),
        className: classNameSchema,
      })
      .describe('The modal panel of a Dialog.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const showCloseButton = useValue(blok.showCloseButton);
    const className = useValue(blok.className);

    return (
      <ShadDialogContent showCloseButton={showCloseButton ?? true} className={className}>
        {renderChildList(children, buildChild)}
      </ShadDialogContent>
    );
  },
);
export const DialogHeader = createPanelBlok(
  'DialogHeader',
  ShadDialogHeader,
  'The header region of a DialogContent.',
);
export const DialogFooter = createPanelBlok(
  'DialogFooter',
  ShadDialogFooter,
  'The footer region of a DialogContent.',
);
export const DialogTitle = createTextPartBlok(
  'DialogTitle',
  ShadDialogTitle,
  'The accessible title of a Dialog.',
);
export const DialogDescription = createTextPartBlok(
  'DialogDescription',
  ShadDialogDescription,
  'Supporting text under a DialogTitle.',
);
export const DialogClose = createTriggerBlok(
  'DialogClose',
  ShadDialogClose,
  'A control that closes the surrounding Dialog.',
);

/* -------------------------------------------------------------------------- */
/* AlertDialog                                                                */
/* -------------------------------------------------------------------------- */

export const AlertDialog = createOverlayRoot(
  'AlertDialog',
  ShadAlertDialog,
  'A modal dialog that interrupts to confirm a decision.',
);
export const AlertDialogTrigger = createTriggerBlok(
  'AlertDialogTrigger',
  ShadAlertDialogTrigger,
  'The control that opens an AlertDialog.',
);
export const AlertDialogContent = createPanelBlok(
  'AlertDialogContent',
  ShadAlertDialogContent,
  'The modal panel of an AlertDialog.',
);
export const AlertDialogHeader = createPanelBlok(
  'AlertDialogHeader',
  ShadAlertDialogHeader,
  'The header region of an AlertDialogContent.',
);
export const AlertDialogFooter = createPanelBlok(
  'AlertDialogFooter',
  ShadAlertDialogFooter,
  'The footer region of an AlertDialogContent.',
);
export const AlertDialogTitle = createTextPartBlok(
  'AlertDialogTitle',
  ShadAlertDialogTitle,
  'The accessible title of an AlertDialog.',
);
export const AlertDialogDescription = createTextPartBlok(
  'AlertDialogDescription',
  ShadAlertDialogDescription,
  'Supporting text under an AlertDialogTitle.',
);
export const AlertDialogAction = createBlokComponent(
  {
    name: 'AlertDialogAction',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        onClick: actionProp('Runs when the action is confirmed.'),
        className: classNameSchema,
      })
      .describe('The confirming button of an AlertDialog; closes it when clicked.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadAlertDialogAction onClick={onClick} className={className}>
        {label ?? 'Continue'}
      </ShadAlertDialogAction>
    );
  },
);
export const AlertDialogCancel = createBlokComponent(
  {
    name: 'AlertDialogCancel',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        className: classNameSchema,
      })
      .describe('The dismissing button of an AlertDialog.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const className = useValue(blok.className);

    return <ShadAlertDialogCancel className={className}>{label ?? 'Cancel'}</ShadAlertDialogCancel>;
  },
);

/* -------------------------------------------------------------------------- */
/* Sheet and Drawer                                                           */
/* -------------------------------------------------------------------------- */

export const Sheet = createOverlayRoot('Sheet', ShadSheet, 'A panel that slides in from an edge.');
export const SheetTrigger = createTriggerBlok(
  'SheetTrigger',
  ShadSheetTrigger,
  'The control that opens a Sheet.',
);
export const SheetContent = createBlokComponent(
  {
    name: 'SheetContent',
    schema: z
      .object({
        children: childListSchema,
        side: sideSchema,
        showCloseButton: boolSchema.describe('Show the corner close button. Defaults to true.'),
        className: classNameSchema,
      })
      .describe('The sliding panel of a Sheet.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const side = useValue(blok.side);
    const showCloseButton = useValue(blok.showCloseButton);
    const className = useValue(blok.className);

    return (
      <ShadSheetContent
        side={side ?? 'right'}
        showCloseButton={showCloseButton ?? true}
        className={className}
      >
        {renderChildList(children, buildChild)}
      </ShadSheetContent>
    );
  },
);
export const SheetHeader = createPanelBlok(
  'SheetHeader',
  ShadSheetHeader,
  'The header region of a SheetContent.',
);
export const SheetFooter = createPanelBlok(
  'SheetFooter',
  ShadSheetFooter,
  'The footer region of a SheetContent.',
);
export const SheetTitle = createTextPartBlok(
  'SheetTitle',
  ShadSheetTitle,
  'The accessible title of a Sheet.',
);
export const SheetDescription = createTextPartBlok(
  'SheetDescription',
  ShadSheetDescription,
  'Supporting text under a SheetTitle.',
);

export const Drawer = createOverlayRoot(
  'Drawer',
  ShadDrawer,
  'A panel that slides up from the bottom edge.',
);
export const DrawerTrigger = createTriggerBlok(
  'DrawerTrigger',
  ShadDrawerTrigger,
  'The control that opens a Drawer.',
);
export const DrawerContent = createPanelBlok(
  'DrawerContent',
  ShadDrawerContent,
  'The sliding panel of a Drawer.',
);
export const DrawerHeader = createPanelBlok(
  'DrawerHeader',
  ShadDrawerHeader,
  'The header region of a DrawerContent.',
);
export const DrawerFooter = createPanelBlok(
  'DrawerFooter',
  ShadDrawerFooter,
  'The footer region of a DrawerContent.',
);
export const DrawerTitle = createTextPartBlok(
  'DrawerTitle',
  ShadDrawerTitle,
  'The accessible title of a Drawer.',
);
export const DrawerDescription = createTextPartBlok(
  'DrawerDescription',
  ShadDrawerDescription,
  'Supporting text under a DrawerTitle.',
);

/* -------------------------------------------------------------------------- */
/* Popover, Tooltip, HoverCard                                                */
/* -------------------------------------------------------------------------- */

/** The three anchored surfaces share one content shape. */
type AnchoredContentComponent = React.ComponentType<{
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  children?: React.ReactNode;
}>;

const createAnchoredContentBlok = (
  name: string,
  Content: AnchoredContentComponent,
  description: string,
) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          children: contentSchema,
          side: sideSchema,
          align: alignmentSchema,
          sideOffset: z.number().optional().describe('Distance from the trigger, in pixels.'),
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      const side = useValue(blok.side);
      const align = useValue(blok.align);
      const sideOffset = useValue(blok.sideOffset);
      const className = useValue(blok.className);

      return (
        <Content side={side} align={align} sideOffset={sideOffset} className={className}>
          {renderContent(children, buildChild)}
        </Content>
      );
    },
  );

export const Popover = createOverlayRoot(
  'Popover',
  ShadPopover,
  'A surface anchored to a trigger, opened on click.',
);
export const PopoverTrigger = createTriggerBlok(
  'PopoverTrigger',
  ShadPopoverTrigger,
  'The control that opens a Popover.',
);
export const PopoverContent = createAnchoredContentBlok(
  'PopoverContent',
  ShadPopoverContent,
  'The floating panel of a Popover.',
);

export const Tooltip = createOverlayRoot(
  'Tooltip',
  ShadTooltip,
  'A short hint shown on hover or focus.',
);
export const TooltipTrigger = createTriggerBlok(
  'TooltipTrigger',
  ShadTooltipTrigger,
  'The element a Tooltip describes.',
);
export const TooltipContent = createAnchoredContentBlok(
  'TooltipContent',
  ShadTooltipContent,
  'The hint shown by a Tooltip.',
);

export const HoverCard = createOverlayRoot(
  'HoverCard',
  ShadHoverCard,
  'A rich preview surface shown on hover.',
);
export const HoverCardTrigger = createTriggerBlok(
  'HoverCardTrigger',
  ShadHoverCardTrigger,
  'The element a HoverCard previews.',
);
export const HoverCardContent = createAnchoredContentBlok(
  'HoverCardContent',
  ShadHoverCardContent,
  'The floating panel of a HoverCard.',
);

/* -------------------------------------------------------------------------- */
/* Menus                                                                      */
/* -------------------------------------------------------------------------- */

type MenuItemComponent = React.ComponentType<{
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  className?: string;
  onSelect?: (event: Event) => void;
  children?: React.ReactNode;
}>;

const createMenuItemBlok = (name: string, Item: MenuItemComponent, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
          icon: iconNameSchema.describe('Icon rendered before the label.'),
          children: contentSchema,
          onSelect: actionProp('Runs when the item is chosen.'),
          variant: z
            .enum(['default', 'destructive'])
            .optional()
            .describe('Item appearance.'),
          disabled: disabledSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const label = useValue(blok.label);
      const icon = useValue(blok.icon);
      const children = useValue(blok.children);
      const onSelect = useAction(blok.onSelect);
      const variant = useValue(blok.variant);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);

      return (
        <Item
          disabled={disabled === true}
          variant={variant ?? 'default'}
          className={className}
          onSelect={() => onSelect?.()}
        >
          {renderIcon(icon)}
          {renderContent(children ?? label, buildChild)}
        </Item>
      );
    },
  );

type MenuCheckboxItemComponent = React.ComponentType<{
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}>;

const createMenuCheckboxItemBlok = (
  name: string,
  Item: MenuCheckboxItemComponent,
  description: string,
) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
          bind: bindSchema,
          checked: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled checked state.'),
          disabled: disabledSchema,
          className: classNameSchema,
          onChange: actionProp('Runs on toggle. Arguments may read $event.'),
        })
        .describe(description),
    },
    ({component, schema}) => {
      const blok = useBlok(component, schema);
      const label = useValue(blok.label);
      const bind = useValue(blok.bind);
      const checked = useValue(blok.checked);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);
      const onChange = useEventAction(blok.onChange);

      const controlled = useControlledValue<boolean>({
        bind,
        value: checked,
        defaultValue: undefined,
        fallback: false,
        parse: asBoolean,
      });

      return (
        <Item
          checked={controlled.value}
          disabled={disabled === true}
          className={className}
          onCheckedChange={next => {
            controlled.setValue(next);
            onChange?.(next);
          }}
        >
          {label}
        </Item>
      );
    },
  );

export const DropdownMenu = createOverlayRoot(
  'DropdownMenu',
  ShadDropdownMenu,
  'A menu opened from a button.',
);
export const DropdownMenuTrigger = createTriggerBlok(
  'DropdownMenuTrigger',
  ShadDropdownMenuTrigger,
  'The control that opens a DropdownMenu.',
);
export const DropdownMenuContent = createPanelBlok(
  'DropdownMenuContent',
  ShadDropdownMenuContent,
  'The menu panel of a DropdownMenu.',
);
export const DropdownMenuLabel = createTextPartBlok(
  'DropdownMenuLabel',
  ShadDropdownMenuLabel,
  'A non-interactive heading inside a menu.',
);
export const DropdownMenuItem = createMenuItemBlok(
  'DropdownMenuItem',
  ShadDropdownMenuItem,
  'One selectable item in a DropdownMenu.',
);
export const DropdownMenuCheckboxItem = createMenuCheckboxItemBlok(
  'DropdownMenuCheckboxItem',
  ShadDropdownMenuCheckboxItem,
  'A menu item bound to a boolean value.',
);
export const DropdownMenuSeparator = createBlokComponent(
  {
    name: 'DropdownMenuSeparator',
    schema: z.object({className: classNameSchema}).describe('A divider between menu groups.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadDropdownMenuSeparator className={className} />;
  },
);

export const ContextMenu = createOverlayRoot(
  'ContextMenu',
  ShadContextMenu,
  'A menu opened by right-clicking its trigger.',
);
export const ContextMenuTrigger = createBlokComponent(
  {
    name: 'ContextMenuTrigger',
    schema: z
      .object({
        children: contentSchema,
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('The region that opens a ContextMenu on right-click.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadContextMenuTrigger disabled={disabled === true} className={className}>
        {renderContent(children, buildChild)}
      </ShadContextMenuTrigger>
    );
  },
);
export const ContextMenuContent = createPanelBlok(
  'ContextMenuContent',
  ShadContextMenuContent,
  'The menu panel of a ContextMenu.',
);
export const ContextMenuLabel = createTextPartBlok(
  'ContextMenuLabel',
  ShadContextMenuLabel,
  'A non-interactive heading inside a context menu.',
);
export const ContextMenuItem = createMenuItemBlok(
  'ContextMenuItem',
  ShadContextMenuItem,
  'One selectable item in a ContextMenu.',
);
export const ContextMenuCheckboxItem = createMenuCheckboxItemBlok(
  'ContextMenuCheckboxItem',
  ShadContextMenuCheckboxItem,
  'A context-menu item bound to a boolean value.',
);
export const ContextMenuSeparator = createBlokComponent(
  {
    name: 'ContextMenuSeparator',
    schema: z
      .object({className: classNameSchema})
      .describe('A divider between context-menu groups.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadContextMenuSeparator className={className} />;
  },
);

export const overlayBlokComponents = [
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
];
