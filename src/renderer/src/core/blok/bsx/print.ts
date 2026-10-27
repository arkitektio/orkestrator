import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentNode,
  BlokComponentProp,
  BlokUtilCall,
} from '../renderer/runtime/types';
import {defaultBlokView, innerContext, isLanguageContainer, type BlokView} from '../spec/catalogs';
import {isExplicitId, loadVocabulary, type BlokContextName} from '../spec/vocabulary';
import {
  CLASS_NAME,
  CLASSES_FUNCTION,
  FETCH_MORE_FUNCTION,
  FOREACH_COMPONENT,
  FOREACH_LET_PROP,
  IMPLICIT_TEXTS,
  REFETCH_FUNCTION,
  TEMPLATE_FUNCTION,
} from './parse';

/**
 * Print a stored v2 tree as BSX: the inverse of `parseBsx`, the port of
 * arkitekt-spec's `arkitekt_spec/blok/unparse.py`. The contract is
 * `parseBsx(printBsx(tree)).tree == tree` (with the same view). A tree the
 * parser could not have produced is refused rather than approximated: text
 * that re-parses into a different tree changes the blok silently on the next
 * save. Operators are printed as operators, `str.template` text and implicit
 * `Text` nodes as text children, a `className` list or object as written.
 */

export const LINE_WIDTH = 100;

export class BsxPrintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BsxPrintError';
  }
}

const refuse = (message: string): never => {
  throw new BsxPrintError(message);
};

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const IMPLICIT = /^(?<parent>.+)\/#(?<index>[0-9]+)$/;
const PLACEHOLDER = /\{\{|\}\}|\{([0-9]+)\}|[{}]/g;

// Precedence: higher binds tighter.
const TERNARY = 1;
const COALESCE = 2;
const OR = 3;
const AND = 4;
const EQUALITY = 5;
const RELATION = 6;
const NOT = 7;
const ATOM = 8;
/** The variadic `logic.*` calls an operator spells: own precedence and joiner. */
const LOGICAL: Readonly<Record<string, readonly [number, string]>> = {
  'logic.all': [AND, ' && '],
  'logic.any': [OR, ' || '],
  'logic.coalesce': [COALESCE, ' ?? '],
};
const COMPARISONS: Readonly<Record<string, string>> = {
  'cmp.eq': '==',
  'cmp.ne': '!=',
  'cmp.gt': '>',
  'cmp.gte': '>=',
  'cmp.lt': '<',
  'cmp.lte': '<=',
};

const isDigits = (value: string): boolean => /^[0-9]+$/.test(value);

const json = (value: string): string => JSON.stringify(value);

/** An attribute string, in the quotes that need no escaping when there are such. */
const quoted = (value: string): string => {
  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (escaped.includes('"') && !escaped.includes("'")) return `'${escaped}'`;
  return `"${escaped.replace(/"/g, '&quot;')}"`;
};

const literalText = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return refuse(`${value} is not a JSON number`);
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return json(value);
  if (Array.isArray(value)) return `[${value.map(literalText).join(', ')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.some(([key]) => !key)) return refuse("an object's key is a non-empty string");
    return `{${entries.map(([key, item]) => `${IDENTIFIER.test(key) ? key : json(key)}: ${literalText(item)}`).join(', ')}}`;
  }
  return refuse(`${String(value)} is not a JSON value`);
};

/**
 * A literal run of text: raw when the parser reads it back unchanged, a string
 * expression otherwise; with `edges`, spaces at its ends would be trimmed too.
 */
const textLiteral = (text: string, edges: boolean): string => {
  const unsafe = !text || (edges && text !== text.replace(/^ +| +$/g, '')) || text.includes('  ') || /[\n\r\t{}<>]/.test(text);
  if (unsafe) return `{${json(text)}}`;
  return text.replace(/&/g, '&amp;');
};

const argumentKeys = (call: BlokUtilCall): Array<string | null> => (call.arguments ?? []).map(argument => argument.key ?? null);

/** The parts a `str.template` call was parsed from, or null when no text spells it. */
const templateParts = (call: BlokUtilCall): Array<string | BlokActionArgument> | null => {
  const byKey = new Map((call.arguments ?? []).map(argument => [argument.key ?? null, argument]));
  const template = byKey.get('template');
  const values = byKey.get('values');
  if (!template || typeof template.value_literal !== 'string' || !values || !Array.isArray(values.value_list)) return null;
  const items = values.value_list;
  const parts: Array<string | BlokActionArgument> = [];
  let literal = '';
  let expected = 0;
  let position = 0;
  const text = template.value_literal;
  for (const match of text.matchAll(PLACEHOLDER)) {
    const start = match.index ?? 0;
    literal += text.slice(position, start);
    position = start + match[0].length;
    const token = match[0];
    if (token === '{{' || token === '}}') {
      literal += token[0];
      continue;
    }
    if (match[1] === undefined || Number(match[1]) !== expected || expected >= items.length) return null;
    if (literal) parts.push(literal);
    literal = '';
    parts.push(items[expected]);
    expected += 1;
  }
  literal += text.slice(position);
  if (literal) parts.push(literal);
  if (expected !== items.length) return null;
  return parts;
};

class Printer {
  private readonly vocabulary = loadVocabulary();

  constructor(
    readonly view: BlokView,
    readonly indent: number,
  ) {}

  node(node: BlokComponentNode, derived: string, depth: number, context: BlokContextName, lines: string[]): void {
    const pad = ' '.repeat(this.indent * depth);
    const spec = this.view.components.get(node.component);
    const inner = spec ? innerContext(spec, context) : context;
    const attributes: string[] = [];
    if (node.id !== derived) {
      if (!isExplicitId(node.id)) {
        refuse(`<${node.component}>: the id '${node.id}' is neither explicit nor the one its place derives ('${derived}')`);
      }
      attributes.push(`id=${quoted(node.id)}`);
    }
    const children = node.children ?? [];
    const elements = children.filter(child => !Printer.isImplicit(child, node.id));
    let textChild: string | null = null;
    const textProp = spec?.textProp ?? null;
    const drawsText = this.vocabulary.contexts[inner]?.text ?? true;
    const props = node.props ?? [];
    props.forEach((prop, position) => {
      // The parser puts the prop text children fill last, so only the last is spelled as text.
      const last = position === props.length - 1;
      if (textProp !== null && prop.key === textProp && last && children.length === 0 && drawsText) {
        const printed = this.textOf(prop, node, true);
        if (printed !== null) {
          textChild = printed;
          return;
        }
      }
      attributes.push(this.attribute(node, prop));
    });
    let head = `<${node.component}${attributes.map(attribute => ` ${attribute}`).join('')}`;
    const wrapped = pad.length + head.length > LINE_WIDTH && attributes.length > 1;
    if (wrapped) {
      head = `<${node.component}\n${attributes.map(attribute => `${pad}${' '.repeat(this.indent)}${attribute}`).join('\n')}\n${pad}`;
    }
    if (textChild !== null) {
      lines.push(`${pad}${head}>${textChild}</${node.component}>`);
      return;
    }
    if (children.length === 0) {
      lines.push(wrapped ? `${pad}${head}/>` : `${pad}${head} />`);
      return;
    }
    lines.push(`${pad}${head}>`);
    const counts = new Map<string, number>();
    let implicit = 0;
    for (const child of children) {
      if (Printer.isImplicit(child, node.id)) {
        if (elements.length === 0 && !isLanguageContainer(spec)) {
          refuse(`<${node.component}> (${node.id}) holds implicit Text with no element beside it`);
        }
        if (child.id !== `${node.id}/#${implicit}`) refuse(`<${node.component}> (${node.id}): implicit Text '${child.id}' is out of order`);
        implicit += 1;
        const only = child.props && child.props.length === 1 ? child.props[0] : null;
        const text = only ? this.textOf(only, child, false) : null;
        if (text === null) refuse(`implicit Text '${child.id}' cannot be spelled as text`);
        lines.push(`${pad}${' '.repeat(this.indent)}${text}`);
        continue;
      }
      const index = counts.get(child.component) ?? 0;
      counts.set(child.component, index + 1);
      this.node(child, `${node.id}/${child.component}[${index}]`, depth + 1, inner, lines);
    }
    lines.push(`${pad}</${node.component}>`);
  }

  static isImplicit(child: BlokComponentNode, parent: string): boolean {
    const match = IMPLICIT.exec(child.id);
    return match !== null && match.groups?.parent === parent && IMPLICIT_TEXTS.includes(child.component);
  }

  /**
   * `prop` as text children, or null when only an attribute spells it.
   * `inline`: printed on the line of its tags, where JSX keeps the spaces at
   * its ends; on a line of its own they are trimmed, so they are spelled as strings.
   */
  private textOf(prop: BlokComponentProp, node: BlokComponentNode, inline: boolean): string | null {
    if (prop.key !== 'text' && IMPLICIT_TEXTS.includes(node.component)) return null;
    if (prop.declares_value || prop.agent_call) return null;
    if (typeof prop.static_value === 'string') return textLiteral(prop.static_value, !inline);
    if (prop.dynamic_value) {
      if (prop.dynamic_value.literal != null || prop.dynamic_value.path == null || prop.static_value != null) return null;
      return `{${prop.dynamic_value.path}}`;
    }
    const call = prop.util_call;
    if (call && call.operation === TEMPLATE_FUNCTION) {
      const parts = templateParts(call);
      if (parts === null) return `{${this.expressionOfCall(call, 0)}}`;
      return parts
        .map((part, index) => {
          const edge = !inline && (index === 0 || index === parts.length - 1);
          return typeof part === 'string' ? textLiteral(part, edge) : `{${this.argument(part, 0)}}`;
        })
        .join('');
    }
    if (call) return `{${this.expressionOfCall(call, 0)}}`;
    if (typeof prop.static_value === 'number') return `{${literalText(prop.static_value)}}`;
    return null;
  }

  private attribute(node: BlokComponentNode, prop: BlokComponentProp): string {
    const {key} = prop;
    if (prop.agent_call) {
      const into = prop.declares_value ? ` into ${prop.declares_value}` : '';
      return `${key}={${this.agentCall(prop.agent_call)}${into}}`;
    }
    if (prop.declares_value != null) {
      if (node.component === FOREACH_COMPONENT && key === FOREACH_LET_PROP && prop.static_value === prop.declares_value) {
        return `${key}=${quoted(prop.declares_value)}`;
      }
      return refuse(`<${node.component}> (${node.id}): ${key} declares '${prop.declares_value}', which BSX cannot spell`);
    }
    if (prop.util_call) {
      const call = prop.util_call;
      const sugar = this.querySugar(call);
      if (sugar !== null) return `${key}={${sugar}}`;
      if (key === CLASS_NAME && call.operation === CLASSES_FUNCTION && call.arguments?.length === 1) {
        const values = call.arguments[0];
        if (values.key === 'values' && (values.value_list != null || values.value_dict != null)) return `${key}={${this.argument(values, 0)}}`;
      }
      return `${key}={${this.expressionOfCall(call, 0)}}`;
    }
    if (prop.dynamic_value) {
      if (prop.dynamic_value.literal != null || prop.dynamic_value.path == null) {
        return refuse(`<${node.component}> (${node.id}): ${key} has a fallback literal, which BSX cannot spell`);
      }
      return `${key}={${prop.dynamic_value.path}}`;
    }
    const value = prop.static_value;
    if (value === true) return key;
    if (typeof value === 'string') return `${key}=${quoted(value)}`;
    if (value !== null && typeof value === 'object' && key === CLASS_NAME) {
      return refuse(`<${node.component}> (${node.id}): a static className list reads back as str.classes`);
    }
    return `${key}={${literalText(value)}}`;
  }

  /**
   * `query.refetch` / `query.fetch_more` as BSX writes them (`queries.<name>.refetch()`),
   * or null when the call is not one the sugar spells (a query named by an expression).
   */
  private querySugar(call: BlokUtilCall): string | null {
    if (call.operation !== REFETCH_FUNCTION && call.operation !== FETCH_MORE_FUNCTION) return null;
    const args = call.arguments ?? [];
    if (!args.length || args[0].key !== 'query') return null;
    const named = args[0];
    if (typeof named.value_literal !== 'string' || !IDENTIFIER.test(named.value_literal)) return null;
    if (named.value_path != null || named.util_call != null || named.agent_call != null || named.value_list != null || named.value_dict != null) {
      return null;
    }
    if (call.operation === REFETCH_FUNCTION) return args.length === 1 ? `queries.${named.value_literal}.refetch()` : null;
    if (args.length > 2) return null;
    const variables: string[] = [];
    if (args.length === 2) {
      const given = args[1];
      if (given.key !== 'variables' || !given.value_dict?.length) return null;
      for (const variable of given.value_dict) {
        if (variable.key == null || !IDENTIFIER.test(variable.key)) return null;
        variables.push(`${variable.key}: ${this.argument(variable, 0)}`);
      }
    }
    return `queries.${named.value_literal}.fetch_more(${variables.join(', ')})`;
  }

  private agentCall(call: BlokAgentCall): string {
    const callee = call.dependency === 'self' ? `self.${call.operation}` : `deps.${call.dependency}.${call.operation}`;
    const args = (call.arguments ?? []).map(argument => {
      if (argument.key == null || !IDENTIFIER.test(argument.key)) {
        return refuse(`${callee}: a task call names its arguments, not '${argument.key ?? 'None'}'`);
      }
      return `${argument.key}: ${this.argument(argument, 0)}`;
    });
    return `${callee}(${args.join(', ')})`;
  }

  private expressionOfCall(call: BlokUtilCall, needed: number): string {
    const [text, precedence] = this.call(call);
    return precedence < needed ? `(${text})` : text;
  }

  private call(call: BlokUtilCall): [string, number] {
    const byKey = new Map((call.arguments ?? []).map(argument => [argument.key ?? null, argument]));
    const keys = argumentKeys(call);
    const get = (key: string): BlokActionArgument => byKey.get(key) ?? {};
    const sameKeys = (expected: string[]) => keys.length === expected.length && keys.every((key, index) => key === expected[index]);
    const {operation} = call;
    if (operation in COMPARISONS && sameKeys(['a', 'b'])) {
      const equality = operation === 'cmp.eq' || operation === 'cmp.ne';
      const needed = equality ? RELATION + 1 : NOT;
      return [`${this.argument(get('a'), needed)} ${COMPARISONS[operation]} ${this.argument(get('b'), needed)}`, equality ? EQUALITY : RELATION];
    }
    const logical = LOGICAL[operation];
    if (logical && sameKeys(['values'])) {
      const values = get('values').value_list;
      if (values && values.length >= 2) {
        const [own, joiner] = logical;
        return [values.map(value => this.argument(value, own + 1)).join(joiner), own];
      }
    }
    if (operation === 'logic.negate' && sameKeys(['a'])) return [`!${this.argument(get('a'), NOT)}`, NOT];
    if (operation === 'logic.choose' && sameKeys(['cond', 'then', 'otherwise'])) {
      return [`${this.argument(get('cond'), COALESCE)} ? ${this.argument(get('then'), 0)} : ${this.argument(get('otherwise'), 0)}`, TERNARY];
    }
    const fn = this.view.functions.get(operation);
    if (!fn) {
      const all = call.arguments ?? [];
      const positional = all.filter(argument => argument.key != null && isDigits(argument.key)).sort((a, b) => Number(a.key) - Number(b.key));
      if (positional.some((argument, index) => argument.key !== String(index))) {
        refuse(`${operation}: its positional arguments are not numbered 0, 1, ...`);
      }
      const printed = [
        ...positional.map(argument => this.argument(argument, 0)),
        ...all.filter(argument => argument.key != null && !isDigits(argument.key)).map(argument => `${argument.key}: ${this.argument(argument, 0)}`),
      ];
      return [`${operation}(${printed.join(', ')})`, ATOM];
    }
    const params = [...fn.keys];
    if (params.length === 1 && params[0] === 'values' && sameKeys(['values'])) {
      const values = get('values');
      if (values.value_list && values.value_list.length >= 2) {
        return [`${operation}(${values.value_list.map(value => this.argument(value, 0)).join(', ')})`, ATOM];
      }
      return [`${operation}(${this.argument(values, 0)})`, ATOM];
    }
    const prefix = keys.every((key, index) => key === params[index]);
    const printed = prefix
      ? keys.map(key => this.argument(get(key ?? ''), 0))
      : keys.filter((key): key is string => key !== null).map(key => `${key}: ${this.argument(get(key), 0)}`);
    return [`${operation}(${printed.join(', ')})`, ATOM];
  }

  argument(argument: BlokActionArgument, needed: number): string {
    if (argument.agent_call) return refuse("a task call is a callback's one thing, never an argument");
    if (argument.value_path != null) return argument.value_path;
    if (argument.util_call) return this.expressionOfCall(argument.util_call, needed);
    if (argument.value_list != null) return `[${argument.value_list.map(item => this.argument(item, 0)).join(', ')}]`;
    if (argument.value_dict != null) {
      const entries = argument.value_dict.map(entry => {
        if (!entry.key) return refuse("an object's key is a non-empty string");
        return `${IDENTIFIER.test(entry.key) ? entry.key : json(entry.key)}: ${this.argument(entry, 0)}`;
      });
      return `{${entries.join(', ')}}`;
    }
    return literalText(argument.value_literal);
  }
}

/** Print `node` as v2 BSX that `parseBsx` (with the same view) reads back into it. Throws a `BsxPrintError`. */
export const printBsx = (node: BlokComponentNode, options: {view?: BlokView; indent?: number} = {}): string => {
  const lines: string[] = [];
  new Printer(options.view ?? defaultBlokView(), options.indent ?? 2).node(node, `${node.component}[0]`, 0, 'HTML', lines);
  return lines.join('\n');
};

