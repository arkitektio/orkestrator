import {
  Accordion as ShadAccordion,
  AccordionContent as ShadAccordionContent,
  AccordionItem as ShadAccordionItem,
  AccordionTrigger as ShadAccordionTrigger,
} from '@/core/ui/accordion';
import {
  Breadcrumb as ShadBreadcrumb,
  BreadcrumbItem as ShadBreadcrumbItem,
  BreadcrumbLink as ShadBreadcrumbLink,
  BreadcrumbList as ShadBreadcrumbList,
  BreadcrumbPage as ShadBreadcrumbPage,
  BreadcrumbSeparator as ShadBreadcrumbSeparator,
} from '@/core/ui/breadcrumb';
import {
  Collapsible as ShadCollapsible,
  CollapsibleContent as ShadCollapsibleContent,
  CollapsibleTrigger as ShadCollapsibleTrigger,
} from '@/core/ui/collapsible';
import {
  Menubar as ShadMenubar,
  MenubarContent as ShadMenubarContent,
  MenubarItem as ShadMenubarItem,
  MenubarMenu as ShadMenubarMenu,
  MenubarSeparator as ShadMenubarSeparator,
  MenubarTrigger as ShadMenubarTrigger,
} from '@/core/ui/menubar';
import {
  Pagination as ShadPagination,
  PaginationContent as ShadPaginationContent,
  PaginationEllipsis as ShadPaginationEllipsis,
  PaginationItem as ShadPaginationItem,
  PaginationLink as ShadPaginationLink,
  PaginationNext as ShadPaginationNext,
  PaginationPrevious as ShadPaginationPrevious,
} from '@/core/ui/pagination';
import {
  Tabs as ShadTabs,
  TabsContent as ShadTabsContent,
  TabsList as ShadTabsList,
  TabsTrigger as ShadTabsTrigger,
} from '@/core/ui/tabs';
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
  asBoolean,
  asString,
  asStringList,
  bindSchema,
  boolSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  disabledSchema,
  renderChildList,
  renderContent,
  useControlledValue,
} from './shared';

/**
 * Navigation and disclosure bloks.
 *
 * Like the overlays, each family is a root plus parts, and the parts reach
 * their root through React context — see the note in `overlays.tsx` about why
 * that works across `buildChild`, and why triggers are never `asChild`.
 */

export const Tabs = createBlokComponent(
  {
    name: 'Tabs',
    schema: z
      .object({
        children: childListSchema.describe('A TabsList plus one TabsContent per tab.'),
        bind: bindSchema.describe('Data-model path holding the active tab value.'),
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled active tab.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initially active tab.'),
        className: classNameSchema,
        onChange: actionProp('Runs when the active tab changes. May read $event.'),
      })
      .describe('A tabbed surface.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    return (
      <ShadTabs
        value={controlled.value === '' ? undefined : controlled.value}
        className={className}
        onValueChange={next => {
          controlled.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadTabs>
    );
  },
);

export const TabsList = createBlokComponent(
  {
    name: 'TabsList',
    schema: z
      .object({
        children: childListSchema.describe('TabsTrigger children.'),
        className: classNameSchema,
      })
      .describe('The row of tab triggers.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadTabsList className={className}>{renderChildList(children, buildChild)}</ShadTabsList>
    );
  },
);

export const TabsTrigger = createBlokComponent(
  {
    name: 'TabsTrigger',
    schema: z
      .object({
        value: z.string().describe('The tab this trigger activates.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One tab in a TabsList.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadTabsTrigger value={value ?? ''} disabled={disabled === true} className={className}>
        {renderIcon(icon)}
        {label ?? value}
      </ShadTabsTrigger>
    );
  },
);

export const TabsContent = createBlokComponent(
  {
    name: 'TabsContent',
    schema: z
      .object({
        value: z.string().describe('The tab this panel belongs to.'),
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The panel shown for one tab.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadTabsContent value={value ?? ''} className={className}>
        {renderChildList(children, buildChild)}
      </ShadTabsContent>
    );
  },
);

export const Accordion = createBlokComponent(
  {
    name: 'Accordion',
    schema: z
      .object({
        children: childListSchema.describe('AccordionItem children.'),
        bind: bindSchema.describe('Data-model path holding the open item value(s).'),
        multiple: boolSchema.describe('Allow more than one section open at a time.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initially open item.'),
        collapsible: boolSchema.describe(
          'Allow closing the open section in single mode. Defaults to true.',
        ),
        className: classNameSchema,
        onChange: actionProp('Runs when the open sections change. May read $event.'),
      })
      .describe('A stack of collapsible sections.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const bind = useValue(blok.bind);
    const multiple = useValue(blok.multiple);
    const defaultValue = useValue(blok.defaultValue);
    const collapsible = useValue(blok.collapsible);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const single = useControlledValue<string>({
      bind: multiple ? undefined : bind,
      value: undefined,
      defaultValue,
      fallback: '',
      parse: asString,
    });
    const many = useControlledValue<string[]>({
      bind: multiple ? bind : undefined,
      value: undefined,
      defaultValue: defaultValue ? [defaultValue] : undefined,
      fallback: [],
      parse: asStringList,
    });

    if (multiple) {
      return (
        <ShadAccordion
          type="multiple"
          value={many.value}
          className={className}
          onValueChange={next => {
            many.setValue(next);
            onChange?.(next);
          }}
        >
          {renderChildList(children, buildChild)}
        </ShadAccordion>
      );
    }

    return (
      <ShadAccordion
        type="single"
        collapsible={collapsible ?? true}
        value={single.value}
        className={className}
        onValueChange={next => {
          single.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadAccordion>
    );
  },
);

export const AccordionItem = createBlokComponent(
  {
    name: 'AccordionItem',
    schema: z
      .object({
        value: z.string().describe('Identifies this section.'),
        children: childListSchema.describe('An AccordionTrigger and an AccordionContent.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One section of an Accordion.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const children = useValue(blok.children);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadAccordionItem value={value ?? ''} disabled={disabled === true} className={className}>
        {renderChildList(children, buildChild)}
      </ShadAccordionItem>
    );
  },
);

export const AccordionTrigger = createBlokComponent(
  {
    name: 'AccordionTrigger',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Section heading.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('The clickable heading of an AccordionItem.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadAccordionTrigger className={className}>
        {renderIcon(icon)}
        {renderContent(children ?? label, buildChild)}
      </ShadAccordionTrigger>
    );
  },
);

export const AccordionContent = createBlokComponent(
  {
    name: 'AccordionContent',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The body of an AccordionItem.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadAccordionContent className={className}>
        {renderChildList(children, buildChild)}
      </ShadAccordionContent>
    );
  },
);

export const Collapsible = createBlokComponent(
  {
    name: 'Collapsible',
    schema: z
      .object({
        children: childListSchema.describe('A CollapsibleTrigger and a CollapsibleContent.'),
        bind: bindSchema.describe('Data-model path holding the open state.'),
        open: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled open state.'),
        defaultOpen: boolSchema.describe('Open on mount when uncontrolled.'),
        className: classNameSchema,
        onChange: actionProp('Runs when it opens or closes. May read $event.'),
      })
      .describe('A single region that can be shown or hidden.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const bind = useValue(blok.bind);
    const open = useValue(blok.open);
    const defaultOpen = useValue(blok.defaultOpen);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<boolean>({
      bind,
      value: open,
      defaultValue: defaultOpen,
      fallback: false,
      parse: asBoolean,
    });

    return (
      <ShadCollapsible
        open={controlled.value}
        className={className}
        onOpenChange={next => {
          controlled.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadCollapsible>
    );
  },
);

export const CollapsibleTrigger = createBlokComponent(
  {
    name: 'CollapsibleTrigger',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('The control that shows or hides a Collapsible.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadCollapsibleTrigger className={className}>
        {renderIcon(icon)}
        {renderContent(children ?? label, buildChild)}
      </ShadCollapsibleTrigger>
    );
  },
);

export const CollapsibleContent = createBlokComponent(
  {
    name: 'CollapsibleContent',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The region a Collapsible shows or hides.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadCollapsibleContent className={className}>
        {renderChildList(children, buildChild)}
      </ShadCollapsibleContent>
    );
  },
);

export const Breadcrumb = createBlokComponent(
  {
    name: 'Breadcrumb',
    schema: z
      .object({
        children: childListSchema.describe('BreadcrumbItem and BreadcrumbSeparator children.'),
        className: classNameSchema,
      })
      .describe('A trail of links back up the hierarchy.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadBreadcrumb className={className}>
        <ShadBreadcrumbList>{renderChildList(children, buildChild)}</ShadBreadcrumbList>
      </ShadBreadcrumb>
    );
  },
);

export const BreadcrumbItem = createBlokComponent(
  {
    name: 'BreadcrumbItem',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Crumb text.'),
        href: BlokPropSchemas.DynamicString.optional().describe('Link target.'),
        current: boolSchema.describe('Render as the current page rather than a link.'),
        onClick: actionProp('Runs when the crumb is clicked.'),
        className: classNameSchema,
      })
      .describe('One crumb in a Breadcrumb.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const href = useValue(blok.href);
    const current = useValue(blok.current);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadBreadcrumbItem className={className}>
        {current ? (
          <ShadBreadcrumbPage>{label}</ShadBreadcrumbPage>
        ) : (
          <ShadBreadcrumbLink href={href} onClick={onClick}>
            {label}
          </ShadBreadcrumbLink>
        )}
      </ShadBreadcrumbItem>
    );
  },
);

export const BreadcrumbSeparator = createBlokComponent(
  {
    name: 'BreadcrumbSeparator',
    schema: z.object({className: classNameSchema}).describe('The divider between two crumbs.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadBreadcrumbSeparator className={className} />;
  },
);

export const Pagination = createBlokComponent(
  {
    name: 'Pagination',
    schema: z
      .object({
        children: childListSchema.describe('PaginationItem children.'),
        className: classNameSchema,
      })
      .describe('Page navigation controls.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadPagination className={className}>
        <ShadPaginationContent>{renderChildList(children, buildChild)}</ShadPaginationContent>
      </ShadPagination>
    );
  },
);

export const PaginationItem = createBlokComponent(
  {
    name: 'PaginationItem',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Page label.'),
        kind: z
          .enum(['page', 'previous', 'next', 'ellipsis'])
          .optional()
          .describe('Which control this item is. Defaults to "page".'),
        active: boolSchema.describe('Mark as the current page.'),
        onClick: actionProp('Runs when the control is clicked.'),
        className: classNameSchema,
      })
      .describe('One control inside a Pagination.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const kind = useValue(blok.kind);
    const active = useValue(blok.active);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadPaginationItem className={className}>
        {kind === 'ellipsis' ? (
          <ShadPaginationEllipsis />
        ) : kind === 'previous' ? (
          <ShadPaginationPrevious onClick={onClick} />
        ) : kind === 'next' ? (
          <ShadPaginationNext onClick={onClick} />
        ) : (
          <ShadPaginationLink isActive={active} onClick={onClick}>
            {label}
          </ShadPaginationLink>
        )}
      </ShadPaginationItem>
    );
  },
);

export const Menubar = createBlokComponent(
  {
    name: 'Menubar',
    schema: z
      .object({
        children: childListSchema.describe('MenubarMenu children.'),
        className: classNameSchema,
      })
      .describe('A horizontal bar of menus.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadMenubar className={className}>{renderChildList(children, buildChild)}</ShadMenubar>
    );
  },
);

export const MenubarMenu = createBlokComponent(
  {
    name: 'MenubarMenu',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Menu title in the bar.'),
        children: childListSchema.describe('MenubarItem children.'),
        className: classNameSchema,
      })
      .describe('One menu in a Menubar, with its trigger and items.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadMenubarMenu>
        <ShadMenubarTrigger className={className}>{label}</ShadMenubarTrigger>
        <ShadMenubarContent>{renderChildList(children, buildChild)}</ShadMenubarContent>
      </ShadMenubarMenu>
    );
  },
);

export const MenubarItem = createBlokComponent(
  {
    name: 'MenubarItem',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        onSelect: actionProp('Runs when the item is chosen.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One item inside a MenubarMenu.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const onSelect = useAction(blok.onSelect);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadMenubarItem
        disabled={disabled === true}
        className={className}
        onSelect={() => onSelect?.()}
      >
        {renderIcon(icon)}
        {label}
      </ShadMenubarItem>
    );
  },
);

export const MenubarSeparator = createBlokComponent(
  {
    name: 'MenubarSeparator',
    schema: z.object({className: classNameSchema}).describe('A divider between menu groups.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadMenubarSeparator className={className} />;
  },
);

export const navigationBlokComponents = [
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  Pagination,
  PaginationItem,
  Menubar,
  MenubarMenu,
  MenubarItem,
  MenubarSeparator,
];
