import {Button as ShadButton} from '@/components/ui/button';
import {ButtonGroup as ShadButtonGroup} from '@/components/ui/button-group';
import {Calendar as ShadCalendar} from '@/components/ui/calendar';
import {Checkbox as ShadCheckbox} from '@/components/ui/checkbox';
import {
  Field as ShadField,
  FieldDescription as ShadFieldDescription,
  FieldError as ShadFieldError,
  FieldGroup as ShadFieldGroup,
  FieldLabel as ShadFieldLabel,
  FieldSet as ShadFieldSet,
} from '@/components/ui/field';
import {Input as ShadInput} from '@/components/ui/input';
import {
  InputGroup as ShadInputGroup,
  InputGroupAddon as ShadInputGroupAddon,
  InputGroupText as ShadInputGroupText,
} from '@/components/ui/input-group';
import {
  InputOTP as ShadInputOTP,
  InputOTPGroup as ShadInputOTPGroup,
  InputOTPSlot as ShadInputOTPSlot,
} from '@/components/ui/input-otp';
import {Label as ShadLabel} from '@/components/ui/label';
import {RadioGroup as ShadRadioGroup, RadioGroupItem as ShadRadioGroupItem} from '@/components/ui/radio-group';
import {
  Select as ShadSelect,
  SelectContent as ShadSelectContent,
  SelectGroup as ShadSelectGroup,
  SelectItem as ShadSelectItem,
  SelectLabel as ShadSelectLabel,
  SelectTrigger as ShadSelectTrigger,
  SelectValue as ShadSelectValue,
} from '@/components/ui/select';
import {Slider as ShadSlider} from '@/components/ui/slider';
import {Switch as ShadSwitch} from '@/components/ui/switch';
import {Textarea as ShadTextarea} from '@/components/ui/textarea';
import {Toggle as ShadToggle} from '@/components/ui/toggle';
import {ToggleGroup as ShadToggleGroup, ToggleGroupItem as ShadToggleGroupItem} from '@/components/ui/toggle-group';
import {cn} from '@/lib/utils';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useAction,
  useBlok,
  useChecks,
  useEventAction,
  useValidation,
  useValue,
} from '../runtime';
import {renderIcon, iconNameSchema} from './icons';
import {
  actionProp,
  asBoolean,
  asNumber,
  asString,
  asStringList,
  bindSchema,
  boolSchema,
  buttonSizeSchema,
  buttonVariantSchema,
  checksSchema,
  childListSchema,
  childSchema,
  classNameSchema,
  contentSchema,
  disabledSchema,
  numberSchema,
  orientationSchema,
  renderChildList,
  renderContent,
  useControlledValue,
} from './shared';

/**
 * Buttons and form controls.
 *
 * Every value-carrying control shares one contract:
 *
 * - `bind` is a data-model path the control reads from and writes back to;
 *   `value`/`defaultValue` are the controlled/uncontrolled alternatives.
 *   `useControlledValue` resolves the three into one value plus a setter.
 * - the change action fires *after* the write, so its arguments can read the
 *   bound path — or `$event`, which carries the new value directly.
 *
 * Multi-part controls (`Select`, `RadioGroup`, `ToggleGroup`) are composed
 * from subcomponents exactly as in shadcn. That works because a child blok is
 * rendered as a real React child, so Radix context reaches it; what it rules
 * out is wrapping a child in `asChild`, since `BlokNode` does not forward refs.
 */

export const Button = createBlokComponent(
  {
    name: 'Button',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        child: childSchema,
        children: contentSchema,
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        onClick: actionProp('Runs when the button is clicked.'),
        className: classNameSchema,
        variant: buttonVariantSchema,
        size: buttonSizeSchema,
        fullWidth: boolSchema.describe('Stretch to the full width of the parent.'),
        disabled: disabledSchema,
        checks: checksSchema,
      })
      .describe('A clickable button.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const validation = useValidation(component, schema);
    const label = useValue(blok.label);
    const child = useValue(blok.child);
    const children = useValue(blok.children);
    const icon = useValue(blok.icon);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);
    const rawVariant = useValue(blok.variant);
    const size = useValue(blok.size);
    const fullWidth = useValue(blok.fullWidth);
    const disabled = useValue(blok.disabled);
    const checks = useChecks(useValue(blok.checks));

    const resolvedVariant =
      rawVariant === 'primary'
        ? 'default'
        : rawVariant === 'borderless'
          ? 'ghost'
          : rawVariant;

    // `checks` are the author-facing guard; validation failures are a payload
    // bug and disable the button too, with the reason in the tooltip.
    const blockingReason = checks.failures[0] ?? validation.validationErrors[0];
    const isDisabled = disabled === true || Boolean(blockingReason);

    return (
      <ShadButton
        variant={resolvedVariant ?? 'default'}
        size={size ?? 'default'}
        // `ShadButton` already applies `buttonVariants({variant, size,
        // className})` internally, so only the extras belong here.
        className={cn(fullWidth && 'w-full', className)}
        onClick={onClick}
        disabled={isDisabled}
        title={blockingReason}
      >
        {renderIcon(icon)}
        {child ? buildChild(child) : renderContent(children ?? label, buildChild)}
      </ShadButton>
    );
  },
);

export const ButtonGroup = createBlokComponent(
  {
    name: 'ButtonGroup',
    schema: z
      .object({
        children: childListSchema,
        orientation: orientationSchema,
        className: classNameSchema,
      })
      .describe('Groups related buttons into one connected control.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const orientation = useValue(blok.orientation);
    const className = useValue(blok.className);

    return (
      <ShadButtonGroup orientation={orientation ?? 'horizontal'} className={className}>
        {renderChildList(children, buildChild)}
      </ShadButtonGroup>
    );
  },
);

export const Input = createBlokComponent(
  {
    name: 'Input',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initial value when uncontrolled.',
        ),
        placeholder: BlokPropSchemas.DynamicString.nullish().describe('Placeholder text.'),
        type: z
          .string()
          .optional()
          .describe('HTML input type, e.g. "text", "number", "email", "password".'),
        className: classNameSchema,
        disabled: disabledSchema,
        readOnly: boolSchema.describe('Show the value but refuse edits.'),
        fullWidth: boolSchema.describe('Stretch to the full width of the parent.'),
        action: actionProp('Runs after each edit. Arguments may read $event.'),
      })
      .describe('A single-line text input.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const placeholder = useValue(blok.placeholder);
    const type = useValue(blok.type);
    const className = useValue(blok.className);
    const disabled = useValue(blok.disabled);
    const readOnly = useValue(blok.readOnly);
    const fullWidth = useValue(blok.fullWidth);
    const action = useEventAction(blok.action);

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    return (
      <ShadInput
        type={type ?? 'text'}
        value={controlled.value}
        placeholder={typeof placeholder === 'string' ? placeholder : undefined}
        className={cn(fullWidth && 'w-full', className)}
        disabled={disabled === true}
        readOnly={readOnly}
        onChange={event => {
          const nextValue = event.target.value;
          controlled.setValue(nextValue);
          action?.(nextValue);
        }}
      />
    );
  },
);

export const Textarea = createBlokComponent(
  {
    name: 'Textarea',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initial value when uncontrolled.',
        ),
        placeholder: BlokPropSchemas.DynamicString.nullish().describe('Placeholder text.'),
        rows: numberSchema.describe('Visible rows.'),
        className: classNameSchema,
        disabled: disabledSchema,
        readOnly: boolSchema.describe('Show the value but refuse edits.'),
        onChange: actionProp('Runs after each edit. Arguments may read $event.'),
      })
      .describe('A multi-line text input.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const placeholder = useValue(blok.placeholder);
    const rows = useValue(blok.rows);
    const className = useValue(blok.className);
    const disabled = useValue(blok.disabled);
    const readOnly = useValue(blok.readOnly);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    return (
      <ShadTextarea
        value={controlled.value}
        rows={rows}
        placeholder={typeof placeholder === 'string' ? placeholder : undefined}
        className={className}
        disabled={disabled === true}
        readOnly={readOnly}
        onChange={event => {
          const nextValue = event.target.value;
          controlled.setValue(nextValue);
          onChange?.(nextValue);
        }}
      />
    );
  },
);

export const Label = createBlokComponent(
  {
    name: 'Label',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Label text.'),
        children: contentSchema,
        htmlFor: z.string().optional().describe('Id of the control this labels.'),
        className: classNameSchema,
      })
      .describe('A label for a form control.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const htmlFor = useValue(blok.htmlFor);
    const className = useValue(blok.className);

    return (
      <ShadLabel htmlFor={htmlFor} className={className}>
        {renderContent(children ?? text, buildChild)}
      </ShadLabel>
    );
  },
);

/** `Checkbox` and `Switch` are the same contract over two presentations. */
const createBooleanControl = (
  name: string,
  description: string,
  Control: typeof ShadCheckbox | typeof ShadSwitch,
) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          bind: bindSchema,
          checked: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled checked state.'),
          defaultChecked: boolSchema.describe('Initial state when uncontrolled.'),
          label: BlokPropSchemas.DynamicString.optional().describe('Text shown beside the control.'),
          disabled: disabledSchema,
          className: classNameSchema,
          onChange: actionProp('Runs on toggle. Arguments may read $event.'),
          checks: checksSchema,
        })
        .describe(description),
    },
    ({component, schema}) => {
      const blok = useBlok(component, schema);
      const bind = useValue(blok.bind);
      const checked = useValue(blok.checked);
      const defaultChecked = useValue(blok.defaultChecked);
      const label = useValue(blok.label);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);
      const onChange = useEventAction(blok.onChange);
      const checks = useChecks(useValue(blok.checks));

      const controlled = useControlledValue<boolean>({
        bind,
        value: checked,
        defaultValue: defaultChecked,
        fallback: false,
        parse: asBoolean,
      });

      const blockingReason = checks.failures[0];
      const control = (
        <Control
          checked={controlled.value}
          disabled={disabled === true || Boolean(blockingReason)}
          className={className}
          title={blockingReason}
          onCheckedChange={next => {
            const nextValue = next === true;
            controlled.setValue(nextValue);
            onChange?.(nextValue);
          }}
        />
      );

      if (!label) {
        return control;
      }

      return (
        <ShadLabel className="flex items-center gap-2 font-normal">
          {control}
          {label}
        </ShadLabel>
      );
    },
  );

export const Checkbox = createBooleanControl(
  'Checkbox',
  'A checkbox bound to a boolean value.',
  ShadCheckbox,
);
export const Switch = createBooleanControl(
  'Switch',
  'A switch bound to a boolean value.',
  ShadSwitch,
);

export const Slider = createBlokComponent(
  {
    name: 'Slider',
    schema: z
      .object({
        bind: bindSchema,
        value: numberSchema.describe('Controlled value.'),
        defaultValue: numberSchema.describe('Initial value when uncontrolled.'),
        min: numberSchema.describe('Minimum. Defaults to 0.'),
        max: numberSchema.describe('Maximum. Defaults to 100.'),
        step: numberSchema.describe('Step size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs while dragging. Arguments may read $event.'),
        onCommit: actionProp('Runs when the drag ends. Arguments may read $event.'),
      })
      .describe('A slider bound to a numeric value.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const min = useValue(blok.min);
    const max = useValue(blok.max);
    const step = useValue(blok.step);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);
    const onCommit = useEventAction(blok.onCommit);

    const controlled = useControlledValue<number>({
      bind,
      value,
      defaultValue,
      fallback: min ?? 0,
      parse: asNumber,
    });

    return (
      <ShadSlider
        value={[controlled.value]}
        min={min ?? 0}
        max={max ?? 100}
        step={step}
        disabled={disabled === true}
        className={className}
        onValueChange={next => {
          const nextValue = next[0] ?? 0;
          controlled.setValue(nextValue);
          onChange?.(nextValue);
        }}
        onValueCommit={next => onCommit?.(next[0] ?? 0)}
      />
    );
  },
);

export const RadioGroup = createBlokComponent(
  {
    name: 'RadioGroup',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled selected value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initially selected value.',
        ),
        children: childListSchema.describe('RadioGroupItem children.'),
        orientation: orientationSchema,
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on selection. Arguments may read $event.'),
      })
      .describe('A group of mutually exclusive options.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const children = useValue(blok.children);
    const orientation = useValue(blok.orientation);
    const disabled = useValue(blok.disabled);
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
      <ShadRadioGroup
        value={controlled.value}
        disabled={disabled === true}
        className={cn(orientation === 'horizontal' && 'flex-row', className)}
        onValueChange={next => {
          controlled.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadRadioGroup>
    );
  },
);

export const RadioGroupItem = createBlokComponent(
  {
    name: 'RadioGroupItem',
    schema: z
      .object({
        value: z.string().describe('The value this option selects.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Text shown beside the radio.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One option inside a RadioGroup.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    const item = (
      <ShadRadioGroupItem value={value ?? ''} disabled={disabled === true} className={className} />
    );

    if (!label) {
      return item;
    }

    return (
      <ShadLabel className="flex items-center gap-2 font-normal">
        {item}
        {label}
      </ShadLabel>
    );
  },
);

export const Select = createBlokComponent(
  {
    name: 'Select',
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled selected value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initially selected value.',
        ),
        children: childListSchema.describe('SelectTrigger and SelectContent children.'),
        disabled: disabledSchema,
        onChange: actionProp('Runs on selection. Arguments may read $event.'),
      })
      .describe('A dropdown select. Compose SelectTrigger and SelectContent inside it.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const children = useValue(blok.children);
    const disabled = useValue(blok.disabled);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    return (
      <ShadSelect
        // Radix treats "" as "nothing selected", which is exactly the empty
        // state here, but it refuses it as an item value — so an unset select
        // passes `undefined` rather than the empty string.
        value={controlled.value === '' ? undefined : controlled.value}
        disabled={disabled === true}
        onValueChange={next => {
          controlled.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadSelect>
    );
  },
);

export const SelectTrigger = createBlokComponent(
  {
    name: 'SelectTrigger',
    schema: z
      .object({
        placeholder: BlokPropSchemas.DynamicString.optional().describe(
          'Shown while nothing is selected.',
        ),
        size: z.enum(['default', 'sm']).optional().describe('Trigger size.'),
        className: classNameSchema,
      })
      .describe('The button that opens a Select.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const placeholder = useValue(blok.placeholder);
    const size = useValue(blok.size);
    const className = useValue(blok.className);

    return (
      <ShadSelectTrigger size={size ?? 'default'} className={className}>
        <ShadSelectValue placeholder={placeholder} />
      </ShadSelectTrigger>
    );
  },
);

export const SelectContent = createBlokComponent(
  {
    name: 'SelectContent',
    schema: z
      .object({
        children: childListSchema.describe('SelectItem and SelectGroup children.'),
        className: classNameSchema,
      })
      .describe('The popup list of a Select.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadSelectContent className={className}>
        {renderChildList(children, buildChild)}
      </ShadSelectContent>
    );
  },
);

export const SelectGroup = createBlokComponent(
  {
    name: 'SelectGroup',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('Groups related SelectItems.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadSelectGroup className={className}>
        {renderChildList(children, buildChild)}
      </ShadSelectGroup>
    );
  },
);

export const SelectLabel = createBlokComponent(
  {
    name: 'SelectLabel',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Group heading.'),
        className: classNameSchema,
      })
      .describe('A heading inside a SelectGroup.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const className = useValue(blok.className);

    return <ShadSelectLabel className={className}>{text}</ShadSelectLabel>;
  },
);

export const SelectItem = createBlokComponent(
  {
    name: 'SelectItem',
    schema: z
      .object({
        value: z.string().describe('The value this option selects.'),
        label: BlokPropSchemas.DynamicString.optional().describe(
          'Option text. Defaults to the value.',
        ),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One option inside a SelectContent.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadSelectItem value={value ?? ''} disabled={disabled === true} className={className}>
        {label ?? value}
      </ShadSelectItem>
    );
  },
);

export const Toggle = createBlokComponent(
  {
    name: 'Toggle',
    schema: z
      .object({
        bind: bindSchema,
        pressed: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled pressed state.'),
        defaultPressed: boolSchema.describe('Initial state when uncontrolled.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        variant: z.enum(['default', 'outline']).optional().describe('Toggle appearance.'),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Toggle size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on toggle. Arguments may read $event.'),
      })
      .describe('A two-state toggle button.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const pressed = useValue(blok.pressed);
    const defaultPressed = useValue(blok.defaultPressed);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const variant = useValue(blok.variant);
    const size = useValue(blok.size);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<boolean>({
      bind,
      value: pressed,
      defaultValue: defaultPressed,
      fallback: false,
      parse: asBoolean,
    });

    return (
      <ShadToggle
        pressed={controlled.value}
        variant={variant ?? 'default'}
        size={size ?? 'default'}
        disabled={disabled === true}
        className={className}
        onPressedChange={next => {
          controlled.setValue(next);
          onChange?.(next);
        }}
      >
        {renderIcon(icon)}
        {label}
      </ShadToggle>
    );
  },
);

export const ToggleGroup = createBlokComponent(
  {
    name: 'ToggleGroup',
    schema: z
      .object({
        bind: bindSchema,
        multiple: boolSchema.describe('Allow more than one item to be pressed.'),
        children: childListSchema.describe('ToggleGroupItem children.'),
        variant: z.enum(['default', 'outline']).optional().describe('Item appearance.'),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Item size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on change. Arguments may read $event.'),
      })
      .describe('A set of toggle buttons. Binds to a string, or to a list when multiple.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const multiple = useValue(blok.multiple);
    const children = useValue(blok.children);
    const variant = useValue(blok.variant);
    const size = useValue(blok.size);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const single = useControlledValue<string>({
      bind: multiple ? undefined : bind,
      value: undefined,
      defaultValue: undefined,
      fallback: '',
      parse: asString,
    });
    const many = useControlledValue<string[]>({
      bind: multiple ? bind : undefined,
      value: undefined,
      defaultValue: undefined,
      fallback: [],
      parse: asStringList,
    });

    const shared = {
      variant: variant ?? 'default',
      size: size ?? 'default',
      disabled: disabled === true,
      className,
    } as const;

    if (multiple) {
      return (
        <ShadToggleGroup
          type="multiple"
          value={many.value}
          onValueChange={next => {
            many.setValue(next);
            onChange?.(next);
          }}
          {...shared}
        >
          {renderChildList(children, buildChild)}
        </ShadToggleGroup>
      );
    }

    return (
      <ShadToggleGroup
        type="single"
        value={single.value}
        onValueChange={next => {
          single.setValue(next);
          onChange?.(next);
        }}
        {...shared}
      >
        {renderChildList(children, buildChild)}
      </ShadToggleGroup>
    );
  },
);

export const ToggleGroupItem = createBlokComponent(
  {
    name: 'ToggleGroupItem',
    schema: z
      .object({
        value: z.string().describe('The value this item contributes.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One item inside a ToggleGroup.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadToggleGroupItem
        value={value ?? ''}
        disabled={disabled === true}
        className={className}
      >
        {renderIcon(icon)}
        {label}
      </ShadToggleGroupItem>
    );
  },
);

export const InputOTP = createBlokComponent(
  {
    name: 'InputOTP',
    schema: z
      .object({
        bind: bindSchema,
        length: numberSchema.describe('Number of slots. Defaults to 6.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onComplete: actionProp('Runs once every slot is filled. Arguments may read $event.'),
      })
      .describe('A one-time-code input.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const length = useValue(blok.length);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onComplete = useEventAction(blok.onComplete);

    const slots = Math.max(1, Math.trunc(length ?? 6));
    const controlled = useControlledValue<string>({
      bind,
      value: undefined,
      defaultValue: undefined,
      fallback: '',
      parse: asString,
    });

    return (
      <ShadInputOTP
        maxLength={slots}
        value={controlled.value}
        disabled={disabled === true}
        className={className}
        onChange={next => controlled.setValue(next)}
        onComplete={next => onComplete?.(next)}
      >
        <ShadInputOTPGroup>
          {Array.from({length: slots}, (_unused, index) => (
            <ShadInputOTPSlot key={index} index={index} />
          ))}
        </ShadInputOTPGroup>
      </ShadInputOTP>
    );
  },
);

export const InputGroup = createBlokComponent(
  {
    name: 'InputGroup',
    schema: z
      .object({
        children: childListSchema.describe('An Input plus InputGroupAddon children.'),
        className: classNameSchema,
      })
      .describe('Wraps an input with leading or trailing addons.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadInputGroup className={className}>
        {renderChildList(children, buildChild)}
      </ShadInputGroup>
    );
  },
);

export const InputGroupAddon = createBlokComponent(
  {
    name: 'InputGroupAddon',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Addon text.'),
        icon: iconNameSchema.describe('Addon icon.'),
        children: childListSchema,
        align: z
          .enum(['inline-start', 'inline-end', 'block-start', 'block-end'])
          .optional()
          .describe('Where the addon sits relative to the input.'),
        className: classNameSchema,
      })
      .describe('A label, icon or button attached to an InputGroup.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const align = useValue(blok.align);
    const className = useValue(blok.className);

    return (
      <ShadInputGroupAddon align={align ?? 'inline-start'} className={className}>
        {renderIcon(icon)}
        {text ? <ShadInputGroupText>{text}</ShadInputGroupText> : null}
        {renderChildList(children, buildChild)}
      </ShadInputGroupAddon>
    );
  },
);

export const FieldSet = createBlokComponent(
  {
    name: 'FieldSet',
    schema: z
      .object({
        children: childListSchema.describe('Field children.'),
        className: classNameSchema,
      })
      .describe('Groups related fields into one form section.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadFieldSet className={className}>
        <ShadFieldGroup>{renderChildList(children, buildChild)}</ShadFieldGroup>
      </ShadFieldSet>
    );
  },
);

export const Field = createBlokComponent(
  {
    name: 'Field',
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Field label.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Helper text.'),
        error: BlokPropSchemas.DynamicString.optional().describe(
          'Error message; shown instead of the description when set.',
        ),
        children: childListSchema.describe('The control this field wraps.'),
        orientation: z
          .enum(['vertical', 'horizontal', 'responsive'])
          .optional()
          .describe('Label placement.'),
        className: classNameSchema,
      })
      .describe('A labelled form field with description and error slots.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const description = useValue(blok.description);
    const error = useValue(blok.error);
    const children = useValue(blok.children);
    const orientation = useValue(blok.orientation);
    const className = useValue(blok.className);

    return (
      <ShadField orientation={orientation ?? 'vertical'} className={className}>
        {label ? <ShadFieldLabel>{label}</ShadFieldLabel> : null}
        {renderChildList(children, buildChild)}
        {error ? (
          <ShadFieldError>{error}</ShadFieldError>
        ) : description ? (
          <ShadFieldDescription>{description}</ShadFieldDescription>
        ) : null}
      </ShadField>
    );
  },
);

/** ISO `YYYY-MM-DD`, which is what a bound date path carries. */
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const parseIsoDate = (raw: string): Date | undefined => {
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const Calendar = createBlokComponent(
  {
    name: 'Calendar',
    schema: z
      .object({
        bind: bindSchema.describe('Data-model path holding an ISO date string (YYYY-MM-DD).'),
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled ISO date.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initial ISO date.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on selection. Arguments may read $event.'),
      })
      .describe('An inline date picker.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const disabled = useValue(blok.disabled);
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
      <ShadCalendar
        mode="single"
        selected={parseIsoDate(controlled.value)}
        disabled={disabled === true}
        className={className}
        onSelect={next => {
          const nextValue = next ? toIsoDate(next) : '';
          controlled.setValue(nextValue);
          onChange?.(nextValue);
        }}
      />
    );
  },
);

export const formBlokComponents = [
  Button,
  ButtonGroup,
  Input,
  Textarea,
  Label,
  Checkbox,
  Switch,
  Slider,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  InputOTP,
  InputGroup,
  InputGroupAddon,
  FieldSet,
  Field,
  Calendar,
];
