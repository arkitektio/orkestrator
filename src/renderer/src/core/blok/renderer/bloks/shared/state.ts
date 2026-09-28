import * as React from 'react';
import {useBinding} from '../../runtime';

/**
 * The `bind` / `value` / `defaultValue` triad every form control shares.
 *
 * Ownership of the value is decided in exactly one place:
 *
 * - an explicit `value` prop wins and makes the control controlled;
 * - otherwise a `bind` path makes it controlled against the data model, and
 *   stays controlled even while the path is still empty (falling back to
 *   `defaultValue`), so the control never flips from uncontrolled to
 *   controlled mid-life;
 * - with neither, the control is uncontrolled and holds its own state.
 *
 * `setValue` always writes through to the binding when there is one. Callers
 * fire their change action *after* it, so an action argument reading the bound
 * path — or `$event` — sees the new value.
 */
export type ControlledValue<T> = {
  value: T;
  setValue: (next: T) => void;
  isBound: boolean;
};

export const useControlledValue = <T,>(options: {
  bind: string | undefined;
  value: T | undefined;
  defaultValue: T | undefined;
  fallback: T;
  /** Coerces a raw data-model value into the control's value type. */
  parse: (raw: unknown) => T;
}): ControlledValue<T> => {
  const {bind, defaultValue, fallback, parse, value} = options;
  const binding = useBinding(bind);
  const [localValue, setLocalValue] = React.useState<T>(() => defaultValue ?? fallback);

  const boundValue = binding
    ? binding.value == null
      ? (defaultValue ?? fallback)
      : parse(binding.value)
    : undefined;

  const controlledValue = value !== undefined ? value : boundValue;
  const isControlled = controlledValue !== undefined;

  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) {
        setLocalValue(next);
      }

      binding?.setValue(next);
    },
    [binding, isControlled],
  );

  return {
    value: isControlled ? controlledValue : localValue,
    setValue,
    isBound: Boolean(binding),
  };
};

export const asString = (raw: unknown): string => (raw == null ? '' : String(raw));

export const asBoolean = (raw: unknown): boolean => raw === true || raw === 'true';

export const asNumber = (raw: unknown): number => {
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const asStringList = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.map(asString);
  }

  return raw == null || raw === '' ? [] : [asString(raw)];
};
