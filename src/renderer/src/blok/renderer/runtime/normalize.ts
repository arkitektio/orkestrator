import {isRecord} from './utils';

/**
 * The GraphQL `ComponentNode` / `ComponentProp` / `UtilCall` / `ActionArgument`
 * types use camelCase field names (`staticValue`, `valueLiteral`, `utilCall`,
 * …) while the blok runtime reads snake_case (`static_value`, `value_literal`,
 * `util_call`, …). Both spellings are accepted everywhere; the GraphQL one is
 * translated here and `__typename` markers are dropped. Unknown keys pass
 * through untouched, so the zod schemas stay the single validation authority.
 */

const ARGUMENT_KEY_MAP: Record<string, string> = {
  valueLiteral: 'value_literal',
  valuePath: 'value_path',
  utilCall: 'util_call',
  agentCall: 'agent_call',
  valueList: 'value_list',
  valueDict: 'value_dict',
};

const PROP_KEY_MAP: Record<string, string> = {
  staticValue: 'static_value',
  dynamicValue: 'dynamic_value',
  declaresValue: 'declares_value',
  utilCall: 'util_call',
  agentCall: 'agent_call',
};

const stripTypename = (raw: Record<string, unknown>): Array<[string, unknown]> =>
  Object.entries(raw).filter(([key]) => key !== '__typename');

export const normalizeBlokArgument = (raw: unknown): unknown => {
  if (!isRecord(raw) || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = {};
  for (const [key, value] of stripTypename(raw)) {
    const mapped = ARGUMENT_KEY_MAP[key] ?? key;
    if (mapped === 'util_call' || mapped === 'agent_call') {
      out[mapped] = value == null ? value : normalizeBlokCall(value);
    } else if (mapped === 'value_list' || mapped === 'value_dict') {
      out[mapped] = Array.isArray(value) ? value.map(normalizeBlokArgument) : value;
    } else {
      out[mapped] = value;
    }
  }
  return out;
};

/** Normalizes a `UtilCall` or `AgentCall` (both carry `arguments`). */
export const normalizeBlokCall = (raw: unknown): unknown => {
  if (!isRecord(raw) || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = {};
  for (const [key, value] of stripTypename(raw)) {
    out[key] = key === 'arguments' && Array.isArray(value) ? value.map(normalizeBlokArgument) : value;
  }
  return out;
};

export const normalizeBlokProp = (raw: unknown): unknown => {
  if (!isRecord(raw) || Array.isArray(raw)) return raw;
  const out: Record<string, unknown> = {};
  for (const [key, value] of stripTypename(raw)) {
    const mapped = PROP_KEY_MAP[key] ?? key;
    if (mapped === 'util_call' || mapped === 'agent_call') {
      out[mapped] = value == null ? value : normalizeBlokCall(value);
    } else if (mapped === 'dynamic_value') {
      out[mapped] = isRecord(value) ? Object.fromEntries(stripTypename(value)) : value;
    } else {
      out[mapped] = value;
    }
  }
  return out;
};

export type BlokComponentTreeConversion = {
  /** Root nodes in the runtime's snake_case shape, ready for preflight. */
  roots: unknown[];
  /**
   * Ids of nodes that were present in the payload but whose content was not
   * selected: the GraphQL fragment selects the tree to a fixed depth, so a
   * deeper node arrives as a bare `{ id }`. They are dropped from `roots`.
   */
  truncatedIds: string[];
};

const isStub = (node: Record<string, unknown>): boolean => typeof node.component !== 'string';

/**
 * Converts a typed GraphQL `ComponentNode[]` tree into the payload the blok
 * runtime validates and renders. Nothing here is validated — that is
 * `preflightBlokDocument`'s job — this only translates spellings.
 */
export const normalizeBlokComponentTree = (
  components: ReadonlyArray<unknown> | null | undefined,
): BlokComponentTreeConversion => {
  const truncatedIds: string[] = [];

  const visit = (raw: unknown): unknown => {
    if (!isRecord(raw) || Array.isArray(raw)) return raw;
    const out: Record<string, unknown> = {};
    for (const [key, value] of stripTypename(raw)) {
      if (key === 'props') {
        out.props = Array.isArray(value) ? value.map(normalizeBlokProp) : value;
      } else if (key === 'children') {
        out.children = Array.isArray(value)
          ? value.flatMap(child => {
              if (isRecord(child) && isStub(child)) {
                truncatedIds.push(typeof child.id === 'string' ? child.id : '?');
                return [];
              }
              return [visit(child)];
            })
          : value;
      } else {
        out[key] = value;
      }
    }
    return out;
  };

  return {roots: (components ?? []).map(visit), truncatedIds};
};
