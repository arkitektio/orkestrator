/**
 * Whether a value fits a local's port: the spec's `check_local_default`
 * (`declare/blok/validate.py`), shared by the validator (`local.default`) and
 * the kept-value check (`renderer/persist.ts`, a kept value that no longer
 * fits its port is dropped). Null always fits: it is known absence.
 */

export type PortShape = {
  kind: string;
  choices?: readonly {value: unknown}[] | null;
};

const isRecord = (value: unknown): boolean => typeof value === 'object' && value !== null && !Array.isArray(value);

const KIND_TESTS: Readonly<Record<string, (value: unknown) => boolean>> = {
  STRING: value => typeof value === 'string',
  DATE: value => typeof value === 'string',
  STRUCTURE: value => typeof value === 'string',
  INT: value => typeof value === 'number' && Number.isInteger(value),
  FLOAT: value => typeof value === 'number',
  QUANTITY: value => typeof value === 'number',
  BOOL: value => typeof value === 'boolean',
  LIST: value => Array.isArray(value),
  DICT: isRecord,
  MODEL: isRecord,
};

const sameValue = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

export const valueFitsPort = (value: unknown, port: PortShape): boolean => {
  if (value === null || value === undefined) return true;
  if (port.kind === 'ENUM' && port.choices) return port.choices.some(choice => sameValue(choice.value, value));
  const test = KIND_TESTS[port.kind];
  return test ? test(value) : true;
};
