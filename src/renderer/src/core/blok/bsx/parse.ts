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
  blokError,
  calleeName,
  childrenOf,
  dotted,
  isLocalName,
  Locator,
  parseAttribute,
  parseExpression,
  type CallExpr,
  type Expr,
} from './expr';
import {BsxSyntaxError, type BsxRange} from './source';

/**
 * BSX v2: a blok's JSX-like source, parsed into the tree that is stored. The
 * port of arkitekt-spec's `arkitekt_spec/blok/bsx.py`, held to its corpus
 * (`core/blok/spec/bsx_v2.json`) by `bsx.test.ts`. The rekuest server parses
 * the same text when a blok is saved and stays the authority; this one drives
 * the editor's preview, markers and completion.
 *
 * - `attr="..."` is always a literal string, `attr={...}` an expression, a bare
 *   `attr` is `true`.
 * - Text children fill the component's `text_prop`; mixed with elements they
 *   become implicit `Text` nodes. Several parts desugar to `str.template`.
 *   Whitespace follows JSX.
 * - `className={[...]}` and `className={{...}}` desugar to `str.classes`.
 * - Operators desugar to `cmp.*` / `logic.*` calls; a callback holds one task
 *   call (`into name` names its record) or one effect.
 *   `queries.<name>.refetch()` and `queries.<name>.fetch_more(name: value, ...)`
 *   desugar to the effects `query.refetch` and `query.fetch_more`, the query
 *   named by a literal.
 */

export const MAX_SOURCE_BYTES = 256 * 1024;
/** The component a run of text becomes when it sits among elements. */
export const IMPLICIT_TEXT = 'Text';
/** Loose text inside an `html@` component becomes a `span`, so an html-only blok stays inside the catalogs it declares. */
export const IMPLICIT_HTML_TEXT = 'span';
export const IMPLICIT_TEXTS: readonly string[] = [IMPLICIT_TEXT, IMPLICIT_HTML_TEXT];
export const CLASS_NAME = 'className';
export const CLASSES_FUNCTION = 'str.classes';
export const TEMPLATE_FUNCTION = 'str.template';
export const IF_COMPONENT = 'if';
export const ELSE_COMPONENT = 'else';
export const FOREACH_COMPONENT = 'foreach';
export const FOREACH_LET_PROP = 'let';
export const FOREACH_ITEMS_PROP = 'items';
export const FOREACH_KEY_PROP = 'key';
export const INTO_KEYWORD = 'into';
export const EVENT_ROOT = 'event';
export const REFETCH_FUNCTION = 'query.refetch';
export const FETCH_MORE_FUNCTION = 'query.fetch_more';
/** The read intents written as methods of a query: `queries.<name>.refetch()`. */
export const QUERY_SUGAR: Readonly<Record<string, string>> = {refetch: REFETCH_FUNCTION, fetch_more: FETCH_MORE_FUNCTION};

const isQuerySugar = (call: CallExpr): boolean =>
  call.callee.length === 3 && (call.callee[0] === 'queries' || call.callee[0] === 'subscriptions') && call.callee[2] in QUERY_SUGAR;

/** Where a node and its props are in the source. */
export type BsxNodeSource = {
  node: BlokComponentNode;
  range: BsxRange;
  tagRange: BsxRange;
  props: Map<string, {nameRange: BsxRange; valueRange: BsxRange}>;
};

export type BsxSourceMap = Map<string, BsxNodeSource>;

export type BsxParseResult =
  | {ok: true; tree: BlokComponentNode; sources: BsxSourceMap}
  | {ok: false; error: BsxSyntaxError};

/* -------------------------------------------------------------------------- */
/* Markup                                                                     */
/* -------------------------------------------------------------------------- */

type MarkupAttribute = {name: string; value: string | Expr | true; offset: number; nameEnd: number; valueStart: number; end: number};
type MarkupText = {kind: 'text'; text: string; offset: number};
type MarkupContainer = {kind: 'container'; expression: Expr; offset: number};
type MarkupElement = {
  kind: 'element';
  name: string;
  offset: number;
  /** Where the opening tag ends (after `>` or `/>`). */
  tagEnd: number;
  /** Where the element ends. */
  end: number;
  attributes: MarkupAttribute[];
  children: Array<MarkupElement | MarkupText | MarkupContainer>;
};

const NAME = /[A-Za-z_][A-Za-z0-9_.:-]*/y;
const ATTRIBUTE = /[A-Za-z_:][A-Za-z0-9_.:-]*/y;
const ENTITY = /&(#[0-9]+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);/g;
const ENTITIES: Readonly<Record<string, string>> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
const isSpace = (char: string | undefined) => char === ' ' || char === '\t' || char === '\r' || char === '\n';

class Markup {
  index = 0;

  constructor(
    readonly source: string,
    readonly locator: Locator,
  ) {}

  fail(code: string, offset?: number, fields: Readonly<Record<string, unknown>> = {}): BsxSyntaxError {
    return blokError(this.locator, code, offset ?? this.index, fields);
  }

  at(text: string): boolean {
    return this.source.startsWith(text, this.index);
  }

  skipSpace(): void {
    while (this.index < this.source.length && isSpace(this.source[this.index])) this.index += 1;
  }

  skipComment(): boolean {
    if (!this.at('<!--')) return false;
    const end = this.source.indexOf('-->', this.index + 4);
    if (end < 0) throw this.fail('bsx.syntax', undefined, {detail: 'a comment is never closed'});
    this.index = end + 3;
    return true;
  }

  skipTrivia(): void {
    for (;;) {
      this.skipSpace();
      if (!this.skipComment()) return;
    }
  }

  document(): MarkupElement {
    this.skipTrivia();
    if (this.index >= this.source.length) throw this.fail('bsx.empty');
    if (!this.at('<')) throw this.fail('bsx.syntax', undefined, {detail: 'a blok starts with an element'});
    const root = this.element();
    this.skipTrivia();
    if (this.index < this.source.length) {
      if (this.at('<')) {
        NAME.lastIndex = this.index + 1;
        const name = NAME.exec(this.source);
        throw this.fail('bsx.multiple_roots', undefined, {component: name ? name[0] : '?'});
      }
      throw this.fail('bsx.syntax', undefined, {detail: 'text after the root element'});
    }
    return root;
  }

  name(pattern: RegExp, what: string): string {
    pattern.lastIndex = this.index;
    const match = pattern.exec(this.source);
    if (!match) throw this.fail('bsx.syntax', undefined, {detail: `expected ${what}`});
    this.index = pattern.lastIndex;
    return match[0];
  }

  element(): MarkupElement {
    const offset = this.index;
    this.index += 1;
    const element: MarkupElement = {
      kind: 'element',
      name: this.name(NAME, 'an element name'),
      offset,
      tagEnd: offset,
      end: offset,
      attributes: [],
      children: [],
    };
    const seen = new Set<string>();
    for (;;) {
      const hadSpace = isSpace(this.source[this.index]);
      this.skipSpace();
      if (this.index >= this.source.length) throw this.fail('bsx.unclosed', offset, {component: element.name});
      if (this.at('/>')) {
        this.index += 2;
        element.tagEnd = this.index;
        element.end = this.index;
        return element;
      }
      if (this.at('>')) {
        this.index += 1;
        element.tagEnd = this.index;
        this.content(element);
        element.end = this.index;
        return element;
      }
      if (!hadSpace) throw this.fail('bsx.syntax', undefined, {detail: 'expected a space before the attribute'});
      const attribute = this.attribute();
      if (seen.has(attribute.name)) {
        throw this.fail('bsx.duplicate_attribute', attribute.offset, {component: element.name, key: attribute.name});
      }
      seen.add(attribute.name);
      element.attributes.push(attribute);
    }
  }

  attribute(): MarkupAttribute {
    const offset = this.index;
    const name = this.name(ATTRIBUTE, 'an attribute name');
    const nameEnd = this.index;
    const save = this.index;
    this.skipSpace();
    if (!this.at('=')) {
      this.index = save;
      return {name, value: true, offset, nameEnd, valueStart: nameEnd, end: nameEnd};
    }
    this.index += 1;
    this.skipSpace();
    if (this.at('"') || this.at("'")) {
      const quote = this.source[this.index];
      const end = this.source.indexOf(quote, this.index + 1);
      if (end < 0) throw this.fail('bsx.syntax', undefined, {detail: `the value of ${name} is never closed`});
      const raw = this.source.slice(this.index + 1, end);
      const valueStart = this.index + 1;
      const value = this.decode(raw, valueStart);
      this.index = end + 1;
      return {name, value, offset, nameEnd, valueStart, end};
    }
    if (this.at('{')) {
      const [start, end] = this.braces();
      const inner = this.source.slice(start, end);
      this.index = end + 1;
      if (!inner.trim()) throw this.fail('expr.syntax', start, {detail: `the value of ${name} is empty`});
      const expression = parseAttribute(inner, start, this.locator);
      return {name, value: expression, offset, nameEnd, valueStart: start, end};
    }
    throw this.fail('bsx.syntax', undefined, {detail: `${name}= takes "a string" or {an expression}`});
  }

  /** The span inside the braces opening at the cursor: strings and nested braces skipped. */
  braces(): [number, number] {
    const start = this.index + 1;
    const {source} = this;
    let depth = 1;
    let index = start;
    while (index < source.length) {
      const char = source[index];
      if (char === '"' || char === "'") {
        index += 1;
        while (index < source.length && source[index] !== char) {
          if (source[index] === '\\') index += 1;
          if (source[index] === '\n') break;
          index += 1;
        }
        index += 1;
        continue;
      }
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) return [start, index];
      }
      index += 1;
    }
    throw this.fail('bsx.syntax', this.index, {detail: "an expression's braces are never closed"});
  }

  content(element: MarkupElement): void {
    for (;;) {
      if (this.index >= this.source.length) throw this.fail('bsx.unclosed', element.offset, {component: element.name});
      if (this.at('</')) {
        const offset = this.index;
        this.index += 2;
        const found = this.name(NAME, 'an element name');
        this.skipSpace();
        if (!this.at('>')) throw this.fail('bsx.syntax', undefined, {detail: `expected '>' to close </${found}`});
        this.index += 1;
        if (found !== element.name) throw this.fail('bsx.mismatched_tag', offset, {found, expected: element.name});
        return;
      }
      if (this.skipComment()) continue;
      if (this.at('<')) {
        element.children.push(this.element());
        continue;
      }
      if (this.at('{')) {
        const offset = this.index;
        const [start, end] = this.braces();
        const inner = this.source.slice(start, end);
        this.index = end + 1;
        const stripped = inner.trim();
        if (!stripped || (stripped.startsWith('/*') && stripped.endsWith('*/'))) continue;
        element.children.push({kind: 'container', expression: parseExpression(inner, start, this.locator), offset});
        continue;
      }
      if (this.at('}')) throw this.fail('bsx.syntax', undefined, {detail: "unexpected '}' in text; write {'}'}"});
      const offset = this.index;
      let end = this.source.length;
      for (const stop of ['<', '{', '}']) {
        const foundAt = this.source.indexOf(stop, this.index);
        if (foundAt >= 0 && foundAt < end) end = foundAt;
      }
      const raw = this.source.slice(this.index, end);
      this.index = end;
      element.children.push({kind: 'text', text: raw, offset});
    }
  }

  decode(raw: string, offset: number): string {
    return raw.replace(ENTITY, (_whole: string, entity: string, at: number) => {
      if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
      if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
      const known = ENTITIES[entity];
      if (known !== undefined) return known;
      throw this.fail('bsx.syntax', offset + at, {detail: `unknown entity &${entity};`});
    });
  }
}

/**
 * JSX's whitespace rule for one run of text: lines trimmed where they break,
 * whitespace-only lines dropped, the rest joined by one space; runs of spaces
 * in a line collapse to one.
 */
export const jsxText = (raw: string): string => {
  const lines = raw.split(/\r\n|\n|\r/);
  const kept: string[] = [];
  lines.forEach((line, index) => {
    let text = line.replace(/\t/g, ' ');
    if (index > 0) text = text.replace(/^ +/, '');
    if (index < lines.length - 1) text = text.replace(/ +$/, '');
    text = text.replace(/ {2,}/g, ' ');
    if (text) kept.push(text);
  });
  return kept.join(' ');
};

/* -------------------------------------------------------------------------- */
/* Lowering                                                                   */
/* -------------------------------------------------------------------------- */

type Part = string | Expr;
type Run = Part[] | MarkupElement;

const isTextRun = (run: Run): run is Part[] => Array.isArray(run);

const isAgentCallName = (call: CallExpr): boolean =>
  (call.callee[0] === 'self' && call.callee.length === 2) || (call.callee[0] === 'deps' && call.callee.length === 3);

class Lowering {
  readonly ids = new Set<string>();
  readonly sources: BsxSourceMap = new Map();
  private readonly vocabulary = loadVocabulary();

  constructor(
    readonly view: BlokView,
    readonly locator: Locator,
    readonly markup: Markup,
  ) {}

  fail(code: string, offset: number, fields: Readonly<Record<string, unknown>> = {}): BsxSyntaxError {
    return blokError(this.locator, code, offset, fields);
  }

  node(
    element: MarkupElement,
    derivedId: string,
    context: BlokContextName,
    parent: string | null,
    inheritedLooseText: string = IMPLICIT_TEXT,
  ): BlokComponentNode {
    const spec = this.view.components.get(element.name);
    // the component loose text becomes here, from the nearest non-language ancestor
    const catalog = spec?.catalog;
    const looseText =
      spec === undefined
        ? inheritedLooseText
        : catalog?.startsWith('html@')
          ? IMPLICIT_HTML_TEXT
          : catalog?.startsWith('base@')
            ? inheritedLooseText
            : IMPLICIT_TEXT;
    if (element.name === ELSE_COMPONENT && parent !== IF_COMPONENT) throw this.fail('bsx.else_outside_if', element.offset);
    let nodeId = derivedId;
    const explicit = element.attributes.find(attribute => attribute.name === 'id');
    if (explicit) {
      if (typeof explicit.value !== 'string' || !isExplicitId(explicit.value)) {
        throw this.fail('bsx.id', explicit.offset, {id: typeof explicit.value === 'string' ? explicit.value : '{...}'});
      }
      if (this.ids.has(explicit.value)) throw this.fail('bsx.duplicate_id', explicit.offset, {id: explicit.value});
      this.ids.add(explicit.value);
      nodeId = explicit.value;
    }

    const props = element.attributes.filter(attribute => attribute.name !== 'id').map(attribute => this.prop(element.name, attribute));
    if (element.name === FOREACH_COMPONENT) this.checkForeach(element);

    const inner = spec ? innerContext(spec, context) : context;

    const children: BlokComponentNode[] = [];
    const runs = this.runs(element);
    const hasElements = element.children.some(child => child.kind === 'element');
    const textRuns = runs.filter(isTextRun);
    let implicitText = false;
    if (textRuns.length > 0) {
      const textProp = this.textTarget(element, inner, textRuns, hasElements);
      implicitText = textProp === null;
      if (textProp !== null) {
        if (props.some(prop => prop.key === textProp)) {
          throw this.fail('bsx.text_and_prop', element.offset, {component: element.name, key: textProp});
        }
        props.push(this.textProp(textProp, textRuns[0], element.offset));
      }
    }
    let implicit = 0;
    const counts = new Map<string, number>();
    let seenElse = false;
    for (const run of runs) {
      if (isTextRun(run)) {
        if (!implicitText) continue;
        if (seenElse) throw this.fail('bsx.else_order', element.offset);
        children.push({id: `${nodeId}/#${implicit}`, component: looseText, props: [this.textProp('text', run, element.offset)]});
        implicit += 1;
        continue;
      }
      const child = run;
      if (element.name === IF_COMPONENT) {
        if (child.name === ELSE_COMPONENT) seenElse = true;
        else if (seenElse) throw this.fail('bsx.else_order', child.offset);
      }
      const index = counts.get(child.name) ?? 0;
      counts.set(child.name, index + 1);
      children.push(this.node(child, `${nodeId}/${child.name}[${index}]`, inner, element.name, looseText));
    }
    if (element.name === IF_COMPONENT) {
      const elses = element.children.filter((child): child is MarkupElement => child.kind === 'element' && child.name === ELSE_COMPONENT);
      for (const other of elses.slice(0, -1)) {
        if (!other.attributes.some(attribute => attribute.name === 'when')) throw this.fail('bsx.else_order', other.offset);
      }
    }

    const node: BlokComponentNode = {
      id: nodeId,
      component: element.name,
      ...(props.length ? {props} : {}),
      ...(children.length ? {children} : {}),
    };
    if (!this.sources.has(nodeId)) {
      this.sources.set(nodeId, {
        node,
        range: {start: element.offset, end: element.end},
        tagRange: {start: element.offset + 1, end: element.offset + 1 + element.name.length},
        props: new Map(
          element.attributes.map(attribute => [
            attribute.name,
            {nameRange: {start: attribute.offset, end: attribute.nameEnd}, valueRange: {start: attribute.valueStart, end: attribute.end}},
          ]),
        ),
      });
    }
    return node;
  }

  private checkForeach(element: MarkupElement): void {
    const attributes = new Map(element.attributes.map(attribute => [attribute.name, attribute]));
    const missing = (
      [
        ['items', 'items={...}'],
        ['let', 'let="name"'],
      ] as const
    )
      .filter(([name]) => !attributes.has(name))
      .map(([, spelled]) => spelled);
    if (missing.length) throw this.fail('bsx.foreach', element.offset, {missing: missing.join(', ')});
    const declared = attributes.get('let');
    if (declared && (typeof declared.value !== 'string' || !isLocalName(declared.value))) {
      throw this.fail('bsx.let', declared.offset, {let: typeof declared.value === 'string' ? declared.value : '{...}'});
    }
    for (const name of ['items', 'key']) {
      const attribute = attributes.get(name);
      if (attribute && (typeof attribute.value === 'string' || attribute.value === true)) {
        throw this.fail('bsx.foreach', attribute.offset, {missing: `${name}={...}, an expression`});
      }
    }
  }

  /** The children as text runs (parts between elements) and elements, in order. */
  private runs(element: MarkupElement): Run[] {
    const runs: Run[] = [];
    let current: Part[] = [];
    const flush = () => {
      const merged: Part[] = [];
      for (const part of current) {
        const last = merged[merged.length - 1];
        if (typeof part === 'string' && typeof last === 'string') merged[merged.length - 1] = last + part;
        else if (!(typeof part === 'string' && !part)) merged.push(part);
      }
      if (merged.length) runs.push(merged);
      current = [];
    };
    for (const child of element.children) {
      if (child.kind === 'element') {
        flush();
        runs.push(child);
      } else if (child.kind === 'text') {
        const text = this.markup.decode(jsxText(child.text), child.offset);
        if (text) current.push(text);
      } else {
        const expression = child.expression;
        if (expression.type === 'literal' && typeof expression.value === 'string') {
          current.push(expression.value);
        } else {
          this.checkPure(expression, child.offset, true);
          current.push(expression);
        }
      }
    }
    flush();
    return runs;
  }

  /** Where text goes: the text_prop (returned), implicit Text nodes (null), or refused. */
  private textTarget(element: MarkupElement, context: BlokContextName, runs: Part[][], hasElements: boolean): string | null {
    const component = this.view.components.get(element.name);
    const sample = runs[0].map(part => (typeof part === 'string' ? part : '{...}')).join('').slice(0, 60);
    if (!component) throw this.fail('bsx.text_unknown_component', element.offset, {component: element.name, text: sample});
    const drawsText = this.vocabulary.contexts[context];
    if (drawsText && !drawsText.text) {
      throw this.fail('bsx.text_in_context', element.offset, {component: element.name, context, text: sample});
    }
    if (component.textProp !== null && !hasElements) {
      if (runs.length > 1) throw this.fail('bsx.text_not_accepted', element.offset, {component: element.name, text: sample});
      return component.textProp;
    }
    if (component.textProp !== null || isLanguageContainer(component)) return null;
    throw this.fail('bsx.text_not_accepted', element.offset, {component: element.name, text: sample});
  }

  private textProp(key: string, parts: Part[], offset: number): BlokComponentProp {
    if (parts.length === 1) {
      const only = parts[0];
      if (typeof only === 'string') return {key, static_value: only};
      return this.value(key, only, offset);
    }
    let template = '';
    const values: BlokActionArgument[] = [];
    for (const part of parts) {
      if (typeof part === 'string') {
        template += part.replace(/\{/g, '{{').replace(/\}/g, '}}');
      } else {
        template += `{${values.length}}`;
        values.push(this.argument(null, part));
      }
    }
    return {
      key,
      util_call: {
        operation: TEMPLATE_FUNCTION,
        arguments: [
          {key: 'template', value_literal: template},
          {key: 'values', value_list: values},
        ],
      },
    };
  }

  private prop(component: string, attribute: MarkupAttribute): BlokComponentProp {
    const value = attribute.value;
    if (value === true) return {key: attribute.name, static_value: true};
    if (typeof value === 'string') {
      if (attribute.name === FOREACH_LET_PROP && component === FOREACH_COMPONENT) {
        return {key: attribute.name, static_value: value, declares_value: value};
      }
      return {key: attribute.name, static_value: value};
    }
    if (attribute.name === FOREACH_LET_PROP && component === FOREACH_COMPONENT) throw this.fail('bsx.let', attribute.offset, {let: '{...}'});
    return this.value(attribute.name, value, attribute.offset);
  }

  private value(key: string, expression: Expr, offset: number): BlokComponentProp {
    switch (expression.type) {
      case 'into': {
        const call = this.agentCall(expression.call);
        if (!call) throw this.fail('callback.into', expression.offset);
        return {key, agent_call: call, declares_value: expression.name};
      }
      case 'literal':
        return {key, static_value: expression.value};
      case 'list':
      case 'object': {
        if (key === CLASS_NAME) {
          return {key, util_call: {operation: CLASSES_FUNCTION, arguments: [this.argument('values', expression)]}};
        }
        const literal = this.literal(expression);
        if (!literal) throw this.fail('expr.dynamic_container', expression.offset);
        return {key, static_value: literal.value};
      }
      case 'path':
        return {key, dynamic_value: {path: dotted(expression)}};
      case 'call': {
        const agent = this.agentCall(expression);
        if (agent) return {key, agent_call: agent};
        const effect = this.queryEffect(expression);
        if (effect) return {key, util_call: effect};
        return {key, util_call: this.utilCall(expression, true)};
      }
      default:
        void offset;
        return {key, util_call: this.operator(expression)};
    }
  }

  /** The JSON value an all-literal expression is, or null when it holds an expression. */
  private literal(expression: Expr): {value: unknown} | null {
    if (expression.type === 'literal') return {value: expression.value};
    if (expression.type === 'list') {
      const items: unknown[] = [];
      for (const item of expression.items) {
        const value = this.literal(item);
        if (!value) return null;
        items.push(value.value);
      }
      return {value: items};
    }
    if (expression.type === 'object') {
      const entries: Record<string, unknown> = {};
      for (const [name, item] of expression.entries) {
        const value = this.literal(item);
        if (!value) return null;
        entries[name] = value.value;
      }
      return {value: entries};
    }
    return null;
  }

  /** A task call (`self.<action>(...)`, `deps.<key>.<action>(...)`), or null. */
  private agentCall(call: CallExpr): BlokAgentCall | null {
    const {callee} = call;
    let dependency: string;
    let operation: string;
    if (callee[0] === 'self' && callee.length === 2) {
      dependency = 'self';
      operation = callee[1];
    } else if (callee[0] === 'deps' && callee.length === 3) {
      dependency = callee[1];
      operation = callee[2];
    } else {
      return null;
    }
    const args: BlokActionArgument[] = [];
    const seen = new Set<string>();
    for (const argument of call.arguments) {
      if (argument.name === null) throw this.fail('callback.positional', argument.offset, {call: calleeName(call)});
      if (seen.has(argument.name)) throw this.fail('expr.duplicate_key', argument.offset, {key: argument.name});
      seen.add(argument.name);
      args.push(this.argument(argument.name, argument.value));
    }
    return {dependency, operation, ...(args.length ? {arguments: args} : {})};
  }

  /** `queries.<name>.refetch()` / `.fetch_more(k: v, ...)` as its effect, or null. */
  private queryEffect(call: CallExpr): BlokUtilCall | null {
    const {callee} = call;
    if (callee.length !== 3 || !(callee[2] in QUERY_SUGAR)) return null;
    if (callee[0] === 'subscriptions') throw this.fail('subscription.refetch', call.offset);
    if (callee[0] !== 'queries') return null;
    const named: BlokActionArgument = {key: 'query', value_literal: callee[1]};
    if (callee[2] === 'refetch') {
      if (call.arguments.length) {
        throw this.fail('expr.arguments', call.offset, {function: calleeName(call), detail: 'refetch takes no arguments'});
      }
      return {operation: REFETCH_FUNCTION, arguments: [named]};
    }
    const variables: BlokActionArgument[] = [];
    const seen = new Set<string>();
    for (const argument of call.arguments) {
      if (argument.name === null) throw this.fail('callback.positional', argument.offset, {call: calleeName(call)});
      if (seen.has(argument.name)) throw this.fail('expr.duplicate_key', argument.offset, {key: argument.name});
      seen.add(argument.name);
      variables.push(this.argument(argument.name, argument.value));
    }
    if (!variables.length) return {operation: FETCH_MORE_FUNCTION, arguments: [named]};
    return {operation: FETCH_MORE_FUNCTION, arguments: [named, {key: 'variables', value_dict: variables}]};
  }

  private utilCall(call: CallExpr, effectAllowed: boolean): BlokUtilCall {
    const name = calleeName(call);
    const fn = this.view.functions.get(name);
    if (!fn) {
      if (!this.vocabulary.functionNamespaces.includes(call.callee[0]) || call.callee.length < 2) {
        throw this.fail('expr.unknown_callee', call.offset, {callee: name});
      }
    } else if (fn.effect && !effectAllowed) {
      throw this.fail('callback.nested', call.offset, {what: name});
    }
    const positional = call.arguments.filter(argument => argument.name === null);
    const named = call.arguments.filter(argument => argument.name !== null);
    if (positional.length && named.length && call.arguments.indexOf(named[0]) < call.arguments.indexOf(positional[positional.length - 1])) {
      throw this.fail('expr.arguments', call.offset, {function: name, detail: 'a positional argument follows a named one'});
    }
    if (!fn) {
      const args = [
        ...positional.map((argument, index) => this.argument(String(index), argument.value)),
        ...named.map(argument => this.argument(argument.name, argument.value)),
      ];
      return {operation: name, ...(args.length ? {arguments: args} : {})};
    }
    const {keys} = fn;
    const resolved = new Map<string, BlokActionArgument>();
    if (keys.length === 1 && keys[0] === 'values' && positional.length > 1) {
      resolved.set('values', {key: 'values', value_list: positional.map(argument => this.argument(null, argument.value))});
    } else {
      if (positional.length > keys.length) {
        throw this.fail('expr.arguments', call.offset, {function: name, detail: `takes at most ${keys.length} arguments (${keys.join(', ')})`});
      }
      positional.forEach((argument, index) => resolved.set(keys[index], this.argument(keys[index], argument.value)));
    }
    for (const argument of named) {
      const key = argument.name ?? '';
      if (!keys.includes(key)) {
        throw this.fail('expr.arguments', argument.offset, {function: name, detail: `has no argument '${key}' (${keys.join(', ')})`});
      }
      if (resolved.has(key)) throw this.fail('expr.arguments', argument.offset, {function: name, detail: `'${key}' is given twice`});
      resolved.set(key, this.argument(key, argument.value));
    }
    const missing = fn.requiredKeys.filter(key => !resolved.has(key));
    if (missing.length) throw this.fail('expr.arguments', call.offset, {function: name, detail: `needs ${missing.join(', ')}`});
    const ordered = keys.flatMap(key => {
      const argument = resolved.get(key);
      return argument ? [argument] : [];
    });
    return {operation: name, ...(ordered.length ? {arguments: ordered} : {})};
  }

  private operator(expression: Expr): BlokUtilCall {
    const {operators} = this.vocabulary;
    switch (expression.type) {
      case 'not':
        return {operation: operators['!'], arguments: [this.argument('a', expression.operand)]};
      case 'compare':
        return {operation: operators[expression.operator], arguments: [this.argument('a', expression.left), this.argument('b', expression.right)]};
      case 'logical':
        return {
          operation: operators[expression.operator],
          arguments: [{key: 'values', value_list: expression.operands.map(operand => this.argument(null, operand))}],
        };
      case 'ternary':
        return {
          operation: operators['?:'],
          arguments: [
            this.argument('cond', expression.cond),
            this.argument('then', expression.then),
            this.argument('otherwise', expression.otherwise),
          ],
        };
      default:
        throw this.fail('expr.syntax', expression.offset, {detail: 'not an operator'});
    }
  }

  /** An expression as a call's argument; task calls and effects (a query's refetch or fetch_more too) are refused. */
  argument(key: string | null, expression: Expr): BlokActionArgument {
    const keyed = key === null ? {} : {key};
    switch (expression.type) {
      case 'literal':
        return expression.value === null ? keyed : {...keyed, value_literal: expression.value};
      case 'path':
        return {...keyed, value_path: dotted(expression)};
      case 'list':
        return {...keyed, value_list: expression.items.map(item => this.argument(null, item))};
      case 'object':
        return {...keyed, value_dict: expression.entries.map(([name, item]) => this.argument(name, item))};
      case 'into':
        throw this.fail('callback.into', expression.offset);
      case 'call':
        this.checkPure(expression, expression.offset, false);
        return {...keyed, util_call: this.utilCall(expression, false)};
      default:
        return {...keyed, util_call: this.operator(expression)};
    }
  }

  /** Refuse a task call or an effect (a query's refetch or fetch_more too) where only a value may be. */
  private checkPure(expression: Expr, offset: number, text: boolean): void {
    if (expression.type === 'call') {
      if (isAgentCallName(expression) || isQuerySugar(expression)) {
        if (text) throw this.fail('bsx.text_callback', offset);
        throw this.fail('callback.nested', expression.offset, {what: `${calleeName(expression)}(...)`});
      }
      const fn = this.view.functions.get(calleeName(expression));
      if (fn?.effect) {
        if (text) throw this.fail('bsx.text_callback', offset);
        throw this.fail('callback.nested', expression.offset, {what: calleeName(expression)});
      }
      for (const argument of expression.arguments) this.checkPure(argument.value, argument.offset, text);
      return;
    }
    for (const inner of childrenOf(expression)) this.checkPure(inner, offset, text);
  }
}

const utf8Length = (source: string): number => new TextEncoder().encode(source).length;

/** Parse a v2 BSX source into the tree a blok stores, and where each node is. Throws a `BsxSyntaxError`. */
export const parseBsx = (source: string, view: BlokView = defaultBlokView()): {tree: BlokComponentNode; sources: BsxSourceMap} => {
  const locator = new Locator(source);
  if (utf8Length(source) > MAX_SOURCE_BYTES) {
    throw blokError(locator, 'bsx.syntax', 0, {detail: `a blok's source is at most ${MAX_SOURCE_BYTES} bytes`});
  }
  const markup = new Markup(source, locator);
  const root = markup.document();
  const lowering = new Lowering(view, locator, markup);
  const tree = lowering.node(root, `${root.name}[0]`, 'HTML', null);
  return {tree, sources: lowering.sources};
};

export const parseBsxSafe = (source: string, view?: BlokView): BsxParseResult => {
  try {
    return {ok: true, ...parseBsx(source, view)};
  } catch (error) {
    if (error instanceof BsxSyntaxError) return {ok: false, error};
    throw error;
  }
};

/** An expression (`args.slide.id`) as a call argument is stored: a query's variable. Throws a `BsxSyntaxError`. */
export const parseBsxArgument = (key: string | null, text: string, view: BlokView = defaultBlokView()): BlokActionArgument => {
  const locator = new Locator(text);
  const expression = parseExpression(text, 0, locator);
  return new Lowering(view, locator, new Markup(text, locator)).argument(key, expression);
};
