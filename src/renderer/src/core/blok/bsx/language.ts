import {defaultBlokView, innerContext, type BlokView, type SpecComponent, type SpecProp} from '../spec/catalogs';
import {loadVocabulary, type BlokContextName, type VocabFunction, type VocabRecordField} from '../spec/vocabulary';
import {FOREACH_COMPONENT, FOREACH_LET_PROP, INTO_KEYWORD} from './parse';
import {blokRootOf, drawnIn, type BlokCheckScope, type BlokPortMatch, type BlokScopeDependency, type BlokScopeLocalPort} from './references';
import type {BsxRange} from './source';

/**
 * What the editor offers at the cursor, worked out from the text alone (it
 * need not parse: the author is mid-word), the spec's catalogs and the
 * vocabulary. No editor types: the Monaco surface (`core/blok/editor`) maps
 * these onto its providers.
 */

export type BsxEnvironment = {
  /** What the blok declares beside its tree: its kind, context, dependencies, locals, queries, ... */
  scope: BlokCheckScope;
  /** The catalogs that draw it; the Orkestrator's when left out. */
  view?: BlokView;
};

export type BsxCompletionKind = 'component' | 'prop' | 'value' | 'dependency' | 'path' | 'function' | 'action' | 'keyword' | 'close';

export type BsxCompletion = {
  label: string;
  insertText: string;
  /** `insertText` is a snippet (`$1`, `${1|a,b|}`, `$0`). */
  snippet: boolean;
  kind: BsxCompletionKind;
  detail?: string;
  documentation?: string;
  /** Replace from here to the cursor. */
  from: number;
  sortText?: string;
};

type OpenElement = {tag: string; attributes: Map<string, string>};

export type BsxCursor =
  | {kind: 'tag'; prefix: string; from: number; stack: OpenElement[]}
  | {kind: 'close'; prefix: string; from: number; stack: OpenElement[]}
  | {kind: 'attrName'; prefix: string; from: number; tag: string; present: Set<string>; stack: OpenElement[]}
  /** Inside `attr="..."`: a literal. */
  | {kind: 'attrValue'; tag: string; attr: string; value: string; from: number; present: Set<string>; stack: OpenElement[]}
  /** Inside `attr={...}`: an expression. */
  | {kind: 'attrExpression'; tag: string; attr: string; expression: string; from: number; stack: OpenElement[]}
  /** Inside `{...}` among a component's children: a text expression. */
  | {kind: 'textExpression'; expression: string; from: number; stack: OpenElement[]}
  | {kind: 'text'; stack: OpenElement[]}
  | {kind: 'none'};

const NAME_CHAR = /[A-Za-z0-9_:.-]/;
const isSpace = (char: string | undefined) => char !== undefined && /\s/.test(char);

const viewOf = (env: BsxEnvironment): BlokView => env.view ?? defaultBlokView();

/** The index of the `}` closing the brace at `start`, or -1 when it is not closed before `limit`. */
const closingBrace = (text: string, start: number, limit: number): number => {
  let depth = 1;
  let index = start + 1;
  while (index < limit) {
    const char = text[index];
    if (char === '"' || char === "'") {
      index += 1;
      while (index < limit && text[index] !== char && text[index] !== '\n') {
        if (text[index] === '\\') index += 1;
        index += 1;
      }
      index += 1;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
    index += 1;
  }
  return -1;
};

/** Attribute names written after the cursor, up to the end of the tag. */
const attributesAhead = (text: string, offset: number): string[] => {
  let end = offset;
  let quote: string | null = null;
  let depth = 0;
  for (; end < text.length; end += 1) {
    const char = text[end];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && (char === '>' || char === '<')) break;
  }
  const ahead = text.slice(offset, end).replace(/"[^"]*"|'[^']*'|\{[^}]*\}/g, '""');
  return [...ahead.matchAll(/([A-Za-z_][\w:.-]*)(?=\s*=|\s|\/|$)/g)].map(match => match[1]);
};

/** Where the cursor is: in a tag name, an attribute name or value, an expression, or between elements. */
export const scanCursor = (text: string, offset: number): BsxCursor => {
  const stack: OpenElement[] = [];
  let index = 0;

  while (index < offset) {
    if (text.startsWith('<!--', index)) {
      const end = text.indexOf('-->', index + 4);
      if (end < 0 || end + 3 > offset) return {kind: 'none'};
      index = end + 3;
      continue;
    }
    if (text[index] === '{') {
      const end = closingBrace(text, index, offset);
      if (end < 0) return {kind: 'textExpression', expression: text.slice(index + 1, offset), from: index + 1, stack};
      index = end + 1;
      continue;
    }
    if (text[index] !== '<') {
      index += 1;
      continue;
    }

    if (text[index + 1] === '/') {
      let end = index + 2;
      while (end < offset && NAME_CHAR.test(text[end])) end += 1;
      if (end >= offset) return {kind: 'close', prefix: text.slice(index + 2, offset), from: index + 2, stack};
      const name = text.slice(index + 2, end);
      const at = stack.map(element => element.tag).lastIndexOf(name);
      if (at >= 0) stack.splice(at);
      const close = text.indexOf('>', end);
      if (close < 0 || close >= offset) return {kind: 'none'};
      index = close + 1;
      continue;
    }

    let cursor = index + 1;
    while (cursor < offset && NAME_CHAR.test(text[cursor])) cursor += 1;
    if (cursor >= offset) return {kind: 'tag', prefix: text.slice(index + 1, offset), from: index + 1, stack};
    const tag = text.slice(index + 1, cursor);
    const attributes = new Map<string, string>();
    const present = () => new Set([...attributes.keys(), ...attributesAhead(text, offset)]);

    for (;;) {
      const before = cursor;
      while (cursor < offset && isSpace(text[cursor])) cursor += 1;
      if (cursor >= offset) {
        if (cursor === before) return {kind: 'none'};
        return {kind: 'attrName', prefix: '', from: offset, tag, present: present(), stack};
      }
      if (text[cursor] === '/' && text[cursor + 1] === '>') {
        cursor += 2;
        break;
      }
      if (text[cursor] === '>') {
        cursor += 1;
        stack.push({tag, attributes});
        break;
      }
      const nameStart = cursor;
      while (cursor < offset && NAME_CHAR.test(text[cursor])) cursor += 1;
      if (cursor >= offset) return {kind: 'attrName', prefix: text.slice(nameStart, offset), from: nameStart, tag, present: present(), stack};
      if (cursor === nameStart) {
        cursor += 1;
        continue;
      }
      const name = text.slice(nameStart, cursor);
      const afterName = cursor;
      while (cursor < offset && isSpace(text[cursor])) cursor += 1;
      if (cursor >= offset) {
        // `disabled |`: a bare attribute, then the next one's name.
        if (cursor === afterName) return {kind: 'none'};
        attributes.set(name, '');
        return {kind: 'attrName', prefix: '', from: offset, tag, present: present(), stack};
      }
      if (text[cursor] !== '=') {
        attributes.set(name, '');
        continue;
      }
      cursor += 1;
      while (cursor < offset && isSpace(text[cursor])) cursor += 1;
      if (cursor >= offset) return {kind: 'none'};
      const opener = text[cursor];
      if (opener === '{') {
        const end = closingBrace(text, cursor, offset);
        if (end < 0) return {kind: 'attrExpression', tag, attr: name, expression: text.slice(cursor + 1, offset), from: cursor + 1, stack};
        attributes.set(name, text.slice(cursor, end + 1));
        cursor = end + 1;
        continue;
      }
      if (opener !== '"' && opener !== "'") continue;
      const valueStart = cursor + 1;
      const valueEnd = text.indexOf(opener, valueStart);
      if (valueEnd < 0 || valueEnd >= offset) {
        return {kind: 'attrValue', tag, attr: name, value: text.slice(valueStart, offset), from: valueStart, present: present(), stack};
      }
      attributes.set(name, text.slice(valueStart, valueEnd));
      cursor = valueEnd + 1;
    }
    index = cursor;
  }
  return {kind: 'text', stack};
};

/* -------------------------------------------------------------------------- */
/* Descriptions                                                               */
/* -------------------------------------------------------------------------- */

export const describeProp = (prop: SpecProp): string =>
  [
    `**${prop.key}**: ${prop.kind.toLowerCase()}${prop.required ? ' (required)' : ''}`,
    prop.description ?? '',
    prop.values ? `one of: ${prop.values.map(value => `\`"${value}"\``).join(', ')}` : '',
    prop.event && prop.event.length ? `event: ${prop.event.map(field => `\`event.${field.key}\` (${field.kind.toLowerCase()})`).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

export const describeComponent = (component: SpecComponent): string => {
  const required = component.props.filter(prop => prop.required).map(prop => prop.key);
  return [
    `**<${component.name}>** · ${component.catalog}`,
    component.description ?? '',
    required.length ? `Requires: ${required.map(key => `\`${key}\``).join(', ')}` : '',
    component.textProp ? `Text children fill \`${component.textProp}\`.` : '',
    component.downstreamOf.length ? `Inside: ${component.downstreamOf.map(name => `\`${name}\``).join(' or ')}` : '',
    component.acceptsChildren ? 'Takes children.' : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};

export const signatureOf = (fn: VocabFunction): string => `${fn.name}(${fn.params.map(param => `${param.key}${param.required ? '' : '?'}`).join(', ')})`;

const describeFunction = (fn: VocabFunction): string =>
  [
    `**${signatureOf(fn)}** → ${fn.returns.toLowerCase()}`,
    fn.description,
    fn.null ? `null: ${fn.null}` : '',
    fn.effect ? 'An effect: only as a callback’s one thing.' : '',
  ]
    .filter(Boolean)
    .join('\n\n');

/* -------------------------------------------------------------------------- */
/* Components and props                                                       */
/* -------------------------------------------------------------------------- */

const contextAt = (env: BsxEnvironment, stack: readonly OpenElement[]): BlokContextName => {
  const view = viewOf(env);
  return stack.reduce<BlokContextName>(
    (context, element) => innerContext(view.components.get(element.tag), context),
    drawnIn(env.scope) as BlokContextName,
  );
};

const fitsUnder = (component: SpecComponent, ancestors: readonly string[], context: BlokContextName): boolean => {
  if (!component.inheritsContext && component.context !== context) return false;
  if (component.downstreamOf.length && !component.downstreamOf.some(name => ancestors.includes(name))) return false;
  return !component.notDownstreamOf.some(name => ancestors.includes(name));
};

const snippetValue = (prop: SpecProp, index: number): string => {
  if (prop.kind === 'STRING' && prop.values?.length) return `"\${${index}|${prop.values.join(',')}|}"`;
  if (prop.kind === 'STRING') return `"\${${index}}"`;
  if (prop.kind === 'BOOL') return `{\${${index}|true,false|}}`;
  return `{\${${index}}}`;
};

const componentCompletion = (component: SpecComponent, from: number): BsxCompletion => {
  const required = component.props.filter(prop => prop.required);
  const attributes = required.map((prop, index) => ` ${prop.key}=${snippetValue(prop, index + 1)}`).join('');
  return {
    label: component.name,
    insertText: component.textProp
      ? `${component.name}${attributes}>$0</${component.name}>`
      : component.acceptsChildren
        ? `${component.name}${attributes}>\n\t$0\n</${component.name}>`
        : `${component.name}${attributes} />`,
    snippet: true,
    kind: 'component',
    detail: component.description?.split(/(?<=\.)\s/)[0] ?? component.catalog,
    documentation: describeComponent(component),
    from,
  };
};

const completeTag = (env: BsxEnvironment, cursor: Extract<BsxCursor, {kind: 'tag'}>): BsxCompletion[] => {
  const view = viewOf(env);
  const {stack, from} = cursor;
  const components = [...view.components.values()];
  if (stack.length === 0) {
    const context = drawnIn(env.scope) as BlokContextName;
    const root = blokRootOf(env.scope.context);
    const candidates = root ? components.filter(component => component.name === root) : components.filter(component => fitsUnder(component, [], context));
    return candidates.map(component => componentCompletion(component, from));
  }
  const parent = view.components.get(stack[stack.length - 1].tag);
  if (parent && !parent.acceptsChildren) return [];
  const ancestors = stack.map(element => element.tag);
  const context = contextAt(env, stack);
  return components
    .filter(component => fitsUnder(component, ancestors, context))
    .map(component => ({
      ...componentCompletion(component, from),
      // What can only sit here (a part of its parent) comes first.
      sortText: `${component.downstreamOf.length ? '0' : '1'}${component.name}`,
    }));
};

const completeAttributeName = (env: BsxEnvironment, cursor: Extract<BsxCursor, {kind: 'attrName'}>): BsxCompletion[] => {
  const component = viewOf(env).components.get(cursor.tag);
  const items: BsxCompletion[] = (component?.props ?? [])
    .filter(prop => !cursor.present.has(prop.key))
    .map((prop, index) => ({
      label: prop.key,
      insertText: `${prop.key}=${snippetValue(prop, 1)}`,
      snippet: true,
      kind: 'prop' as const,
      detail: `${prop.kind.toLowerCase()}${prop.required ? ' · required' : ''}`,
      documentation: describeProp(prop),
      from: cursor.from,
      sortText: `${prop.required ? '0' : '1'}${String(index).padStart(3, '0')}`,
    }));
  const extra = (label: string, insertText: string, detail: string, documentation: string) => {
    if (cursor.present.has(label)) return;
    items.push({label, insertText, snippet: true, kind: 'prop', detail, documentation, from: cursor.from, sortText: `2${label}`});
  };
  extra('id', 'id="$1"', 'node id', 'An explicit, stable id: for a component that something targets or that keeps its own state.');
  if (component && !component.props.some(prop => prop.key === 'when')) {
    extra('when', 'when={$1}', 'guard', 'Renders the component only while the expression is truthy.');
  }
  return items.sort((left, right) => (left.sortText ?? '').localeCompare(right.sortText ?? ''));
};

/* -------------------------------------------------------------------------- */
/* Tailwind                                                                   */
/* -------------------------------------------------------------------------- */

const COLOUR_UTILITIES = ['bg', 'text', 'border', 'ring', 'fill', 'stroke'];

/** Class completions for a `className`: the theme's roles, its custom variants and the data attributes every component sets. */
const classCompletions = (value: string, end: number): BsxCompletion[] => {
  const {theme} = loadVocabulary();
  const word = /([^\s"']*)$/.exec(value)?.[1] ?? '';
  const from = end - word.length;
  // After a variant (`hover:`, `data-[busy]:`), complete the utility that follows it.
  const variantPrefix = word.slice(0, word.lastIndexOf(':') + 1);
  const item = (label: string, detail: string): BsxCompletion => ({
    label: `${variantPrefix}${label}`,
    insertText: `${variantPrefix}${label}`,
    snippet: false,
    kind: 'value',
    detail,
    from,
  });
  const items: BsxCompletion[] = [];
  for (const utility of COLOUR_UTILITIES) for (const role of theme.colourRoles) items.push(item(`${utility}-${role}`, 'colour role'));
  if (!variantPrefix) {
    for (const variant of theme.customVariants) items.push(item(`${variant}:`, 'theme variant'));
    // Every component sets exactly these (vocabulary `theme.data_attributes`); a catalog declares none.
    for (const [attribute, meaning] of Object.entries(theme.dataAttributes)) items.push(item(`data-[${attribute}]:`, meaning));
  }
  return items;
};

/* -------------------------------------------------------------------------- */
/* Expressions                                                                */
/* -------------------------------------------------------------------------- */

const inString = (expression: string): boolean => {
  let quote: string | null = null;
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
  }
  return quote !== null;
};

/** The unclosed `(` the cursor is inside, if any, and how many commas precede it at its depth. */
const openCall = (expression: string): {callee: string; argument: number; named: string | null} | null => {
  let quote: string | null = null;
  const opens: {at: number; commas: number; last: number}[] = [];
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[' || char === '{') opens.push({at: index, commas: char === '(' ? 0 : -1, last: index + 1});
    else if (char === ')' || char === ']' || char === '}') opens.pop();
    else if (char === ',' && opens.length && opens[opens.length - 1].commas >= 0) {
      opens[opens.length - 1].commas += 1;
      opens[opens.length - 1].last = index + 1;
    }
  }
  const call = [...opens].reverse().find(open => open.commas >= 0);
  if (!call) return null;
  const callee = /([A-Za-z_][\w.]*)\s*$/.exec(expression.slice(0, call.at));
  if (!callee) return null;
  const named = /^\s*([A-Za-z_]\w*)\s*:/.exec(expression.slice(call.last))?.[1] ?? null;
  return {callee: callee[1], argument: call.commas, named};
};

const recordFields = (name: string): readonly VocabRecordField[] => loadVocabulary().records[name]?.fields ?? [];

/** The children of a port match list below `path` (`arm.joints`), or null when unknown. */
const matchChildren = (matches: readonly BlokPortMatch[] | null | undefined, path: readonly string[]): readonly BlokPortMatch[] | null => {
  let current = matches ?? null;
  for (const part of path) {
    if (!current) return null;
    const next: BlokPortMatch | undefined = current.find(match => match.key === part) ?? (current.length === 1 && current[0].key === '...' ? current[0] : undefined);
    if (!next) return null;
    current = next.children ?? null;
  }
  return current;
};

const recordChildren = (fields: readonly VocabRecordField[], path: readonly string[]): readonly VocabRecordField[] | null => {
  let current: readonly VocabRecordField[] | null = fields;
  for (const part of path) {
    const next: VocabRecordField | undefined = current?.find(field => field.key === part);
    if (!next) return null;
    current = next.children;
  }
  return current;
};

type ExpressionPlace = {
  /** The callback prop the expression is the value of, if any: tasks and effects (a query's refetch, fetch_more) may be called. */
  callback: SpecProp | null;
  tag: string | null;
  stack: readonly OpenElement[];
  inErrorSlot: boolean;
};

const intoNames = (text: string): string[] => [...new Set([...text.matchAll(new RegExp(`\\b${INTO_KEYWORD}\\s+([A-Za-z_]\\w*)`, 'g'))].map(match => match[1]))];

const foreachLets = (stack: readonly OpenElement[]): string[] =>
  stack
    .filter(element => element.tag === FOREACH_COMPONENT)
    .map(element => element.attributes.get(FOREACH_LET_PROP) ?? '')
    .filter(Boolean);

const dependencyOf = (env: BsxEnvironment, key: string): BlokScopeDependency | undefined =>
  env.scope.dependencies.find(dependency => dependency.key === key);

const completeExpression = (env: BsxEnvironment, text: string, expression: string, end: number, place: ExpressionPlace): BsxCompletion[] => {
  if (inString(expression)) return [];
  const vocabulary = loadVocabulary();
  const view = viewOf(env);
  const roots = vocabulary.kinds[env.scope.kind].roots;
  const calls = place.callback !== null;
  const depth = (expression.replace(/"[^"]*"|'[^']*'/g, '').match(/\(/g) ?? []).length - (expression.replace(/"[^"]*"|'[^']*'/g, '').match(/\)/g) ?? []).length;
  // Only the callback's own one thing may be a call; arguments are values.
  const topCall = calls && depth <= 0;

  if (topCall && /\)\s+\w*$/.test(expression)) {
    const partial = /(\w*)$/.exec(expression)?.[1] ?? '';
    return [
      {
        label: INTO_KEYWORD,
        insertText: `${INTO_KEYWORD} \${1:run}`,
        snippet: true,
        kind: 'keyword',
        detail: "name the call's record",
        documentation: '`<call> into run` keeps what the call does under `run`: read `run.running`, `run.returns.<port>`, `run.args`, …',
        from: end - partial.length,
      },
    ];
  }

  const match = /((?:[A-Za-z_]\w*\.)*)([A-Za-z_]\w*)?$/.exec(expression);
  const chain = match?.[1] ? match[1].slice(0, -1).split('.') : [];
  const partial = match?.[2] ?? '';
  const before = expression.slice(0, expression.length - (match?.[0].length ?? 0));
  if (/[\w)\]'"]$/.test(before)) return [];
  const from = end - partial.length;
  const item = (label: string, kind: BsxCompletionKind, detail?: string, documentation?: string, insertText = label, snippet = false): BsxCompletion => ({
    label,
    insertText,
    snippet,
    kind,
    detail,
    documentation,
    from,
  });
  const fieldItems = (fields: readonly VocabRecordField[], detail: string) =>
    fields.map(field => item(field.key, 'path', `${detail} · ${field.kind.toLowerCase()}${field.nullable ? ' | null' : ''}`, field.description ?? undefined));
  const matchItems = (matches: readonly BlokPortMatch[] | null, detail: string) =>
    (matches ?? []).filter(child => child.key && child.key !== '...').map(child => item(child.key ?? '', 'path', `${detail}${child.kind ? ` · ${child.kind.toLowerCase()}` : ''}`));

  /** What follows a task record: `task.`, `<into>.`, `deps.<key>.tasks.<action>.`. */
  const taskRecord = (path: readonly string[], returns: readonly BlokPortMatch[] | null | undefined): BsxCompletion[] => {
    if (path.length === 0) {
      return [
        ...fieldItems(recordFields('task'), 'task record'),
        ...(topCall && roots.includes('task') ? [item('answer', 'function', 'answer the open ask', undefined, 'answer(values: {$1})', true)] : []),
      ];
    }
    if (path[0] === 'returns') return matchItems(matchChildren(returns, path.slice(1)), 'return');
    const nested = recordChildren(recordFields('task'), path);
    return nested ? fieldItems(nested, 'task record') : [];
  };

  /** What follows an agent: `self.`, `deps.<key>.`. */
  const agent = (dependency: BlokScopeDependency | undefined, path: readonly string[]): BsxCompletion[] => {
    const {agentSegments} = vocabulary;
    const actions = dependency?.action_dependencies ?? [];
    const states = dependency?.state_dependencies ?? [];
    if (path.length === 0) {
      return [
        ...states.map(state => item(state.key, 'path', 'state')),
        item(agentSegments.tasks, 'keyword', 'the latest task of each action'),
        item(agentSegments.assets, 'keyword', 'files its app registered'),
        ...Object.entries(agentSegments.fields).map(([field, description]) => item(field, 'path', 'agent', description)),
        ...(topCall
          ? actions.map(action => {
              const names = (action.demand?.arg_matches ?? []).map(arg => arg.key).filter((key): key is string => Boolean(key));
              const args = names.map((name, index) => `${name}: \${${index + 1}}`).join(', ');
              return item(action.key, 'action', 'start a task', undefined, `${action.key}(${args})`, true);
            })
          : []),
      ];
    }
    const [head, ...rest] = path;
    if (head === agentSegments.tasks) {
      if (rest.length === 0) return actions.map(action => item(action.key, 'action', 'its latest task'));
      const action = actions.find(candidate => candidate.key === rest[0]);
      return taskRecord(rest.slice(1), action?.demand?.return_matches);
    }
    if (head === agentSegments.assets) return [];
    const state = states.find(candidate => candidate.key === head);
    return state ? matchItems(matchChildren(state.demand?.matches, rest), `${head}`) : [];
  };

  const into = intoNames(text);
  const lets = foreachLets(place.stack);

  if (chain.length === 0) {
    const items: BsxCompletion[] = [];
    for (const root of roots) items.push(item(root, 'keyword', 'root', vocabulary.dataRoots[root]));
    if (calls) items.push(item('event', 'keyword', 'what the component hands its callback', vocabulary.dataRoots.event));
    if (place.inErrorSlot) items.push(item('error', 'keyword', 'the error that made the boundary show', vocabulary.scopedRoots.error));
    for (const local of env.scope.locals) items.push(item(local.key, 'path', 'local'));
    for (const name of into) items.push(item(name, 'path', "a call's record"));
    for (const name of lets) items.push(item(name, 'path', 'foreach item'));
    for (const namespace of vocabulary.functionNamespaces) {
      if (namespace === 'ui' && !topCall) continue;
      items.push(item(namespace, 'keyword', 'functions'));
    }
    for (const literal of ['true', 'false', 'null']) items.push(item(literal, 'keyword'));
    return items;
  }

  const [first, ...rest] = chain;
  if (vocabulary.functionNamespaces.includes(first) && rest.length === 0) {
    return [...view.functions.values()]
      .filter(fn => fn.name.startsWith(`${first}.`) && (!fn.effect || topCall))
      .map(fn => {
        const short = fn.name.slice(first.length + 1);
        return item(short, 'function', signatureOf(fn), describeFunction(fn), `${short}($1)`, true);
      });
  }
  if (lets.includes(first)) return [];
  if (into.includes(first)) {
    const call = new RegExp(`(?:self|deps\\.(\\w+))\\.(\\w+)\\([^)]*\\)\\s+${INTO_KEYWORD}\\s+${first}\\b`).exec(text);
    const dependency = call ? dependencyOf(env, call[1] ?? 'self') : undefined;
    const action = dependency?.action_dependencies?.find(candidate => candidate.key === call?.[2]);
    return taskRecord(rest, action?.demand?.return_matches);
  }
  const local = env.scope.locals.find(candidate => candidate.key === first);
  if (local) {
    // A local is a port: complete the fields its port declares (a list's item is keyed `...`).
    let port: Pick<BlokScopeLocalPort, 'children'> | undefined = local;
    for (const part of rest) {
      const children: readonly BlokScopeLocalPort[] = port?.children ?? [];
      port = children.find(child => child.key === part) ?? (children.length === 1 && children[0].key === '...' ? children[0] : undefined);
    }
    return (port?.children ?? [])
      .filter(child => child.key !== '...')
      .map(child => item(child.key, 'path', `local field · ${child.kind.toLowerCase()}`, child.description ?? undefined));
  }
  if (first === 'event') {
    if (!calls || !place.callback) return [];
    return rest.length === 0 ? (place.callback.event ?? []).map(field => item(field.key, 'path', `event · ${field.kind.toLowerCase()}`, field.description ?? undefined)) : [];
  }
  if (first === 'error') return place.inErrorSlot && rest.length === 0 ? fieldItems(recordFields('error'), 'error') : [];
  if (!roots.includes(first)) return [];
  switch (first) {
    case 'self':
      return agent(dependencyOf(env, 'self'), rest);
    case 'deps':
      if (rest.length === 0) return env.scope.dependencies.filter(dependency => dependency.key !== 'self').map(dependency => item(dependency.key, 'dependency', 'dependency'));
      return agent(dependencyOf(env, rest[0]), rest.slice(1));
    case 'args':
      return rest.length === 0 ? (env.scope.args ?? []).map(arg => item(arg, 'path', 'arg')) : [];
    case 'task':
      return taskRecord(rest, null);
    case 'viewer': {
      const fields = recordChildren(recordFields('viewer'), rest);
      return fields ? fieldItems(fields, 'viewer') : [];
    }
    case 'queries':
      if (rest.length === 0) return env.scope.queries.map(query => item(query.key, 'path', `query · ${query.service ?? ''}`));
      if (rest.length === 1) {
        return [
          ...fieldItems(recordFields('query'), 'query record'),
          ...(topCall
            ? [
                item('refetch', 'function', 'read it again (stale-while-revalidate)', undefined, 'refetch()'),
                ...(env.scope.queries.find(query => query.key === rest[0])?.more
                  ? [item('fetch_more', 'function', 'read the next page and append it', undefined, 'fetch_more($1)', true)]
                  : []),
              ]
            : []),
        ];
      }
      return [];
    case 'subscriptions':
      if (rest.length === 0) return env.scope.subscriptions.map(subscription => item(subscription.key, 'path', `subscription · ${subscription.service ?? ''}`));
      return rest.length === 1 ? fieldItems(recordFields('subscription'), 'subscription record') : [];
    default:
      return [];
  }
};

const placeOf = (env: BsxEnvironment, tag: string | null, attr: string | null, stack: readonly OpenElement[]): ExpressionPlace => {
  const prop = tag && attr ? viewOf(env).components.get(tag)?.props.find(candidate => candidate.key === attr) : undefined;
  const tags = stack.map(element => element.tag);
  const errorAt = tags.lastIndexOf('error');
  return {
    callback: prop?.kind === 'CALLBACK' ? prop : null,
    tag,
    stack,
    inErrorSlot: errorAt > 0 && tags[errorAt - 1] === 'suspense',
  };
};

export const completeBsx = (text: string, offset: number, env: BsxEnvironment): BsxCompletion[] => {
  const cursor = scanCursor(text, offset);
  switch (cursor.kind) {
    case 'tag':
      return completeTag(env, cursor);
    case 'close': {
      const open = cursor.stack[cursor.stack.length - 1];
      if (!open) return [];
      return [{label: `/${open.tag}`, insertText: `${open.tag}>`, snippet: false, kind: 'close', from: cursor.from}];
    }
    case 'attrName':
      return completeAttributeName(env, cursor);
    case 'attrValue':
      return cursor.attr === 'className' ? classCompletions(cursor.value, cursor.from + cursor.value.length) : [];
    case 'attrExpression': {
      const end = cursor.from + cursor.expression.length;
      if (cursor.tag === FOREACH_COMPONENT && cursor.attr === FOREACH_LET_PROP) return [];
      if (cursor.attr === 'className' && inString(cursor.expression)) {
        const quote = Math.max(cursor.expression.lastIndexOf('"'), cursor.expression.lastIndexOf("'"));
        return classCompletions(cursor.expression.slice(quote + 1), end);
      }
      return completeExpression(env, text, cursor.expression, end, placeOf(env, cursor.tag, cursor.attr, cursor.stack));
    }
    case 'textExpression':
      return completeExpression(env, text, cursor.expression, cursor.from + cursor.expression.length, placeOf(env, null, null, cursor.stack));
    default:
      return [];
  }
};

/* -------------------------------------------------------------------------- */
/* Hover and signatures                                                       */
/* -------------------------------------------------------------------------- */

const wordAt = (text: string, offset: number, pattern: RegExp): BsxRange | null => {
  let start = offset;
  let end = offset;
  while (start > 0 && pattern.test(text[start - 1])) start -= 1;
  while (end < text.length && pattern.test(text[end])) end += 1;
  return end > start ? {start, end} : null;
};

/** What the word under the cursor is: a component, a prop, a function, or a root. */
export const hoverBsx = (text: string, offset: number, env: BsxEnvironment): {contents: string; range: BsxRange} | null => {
  const word = wordAt(text, offset, /[\w-]/);
  if (!word) return null;
  const name = text.slice(word.start, word.end);
  const cursor = scanCursor(text, word.end);
  const view = viewOf(env);
  const vocabulary = loadVocabulary();

  if (cursor.kind === 'tag' || cursor.kind === 'close') {
    const component = view.components.get(name);
    return component ? {contents: describeComponent(component), range: word} : null;
  }
  if (cursor.kind === 'attrName') {
    const prop = view.components.get(cursor.tag)?.props.find(candidate => candidate.key === name);
    return prop ? {contents: describeProp(prop), range: word} : null;
  }
  if (cursor.kind === 'attrExpression' || cursor.kind === 'textExpression') {
    const dotted = wordAt(text, offset, /[\w.]/);
    const path = dotted ? text.slice(dotted.start, dotted.end) : name;
    const fn = view.functions.get(path);
    if (fn) return {contents: describeFunction(fn), range: dotted ?? word};
    const description = vocabulary.dataRoots[name] ?? vocabulary.scopedRoots[name];
    if (description && path.split('.')[0] === name) return {contents: `**${name}**\n\n${description}`, range: word};
  }
  return null;
};

export type BsxSignature = {
  label: string;
  documentation?: string;
  parameters: {label: string; documentation?: string}[];
  activeParameter: number;
};

/** Inside a call: a function's parameters, or a task call's arguments, and which one the cursor is on. */
export const signatureBsx = (text: string, offset: number, env: BsxEnvironment): BsxSignature | null => {
  const cursor = scanCursor(text, offset);
  if (cursor.kind !== 'attrExpression' && cursor.kind !== 'textExpression') return null;
  const call = openCall(cursor.expression);
  if (!call) return null;
  const fn = viewOf(env).functions.get(call.callee);
  if (fn) {
    const parameters = fn.params.map(param => ({label: param.key, documentation: `${param.kind.toLowerCase()}${param.required ? '' : ' (optional)'}`}));
    const named = call.named ? parameters.findIndex(param => param.label === call.named) : -1;
    return {
      label: signatureOf(fn),
      documentation: fn.description || undefined,
      parameters,
      activeParameter: named >= 0 ? named : Math.min(call.argument, Math.max(0, parameters.length - 1)),
    };
  }
  const parts = call.callee.split('.');
  const target = parts[0] === 'self' && parts.length === 2 ? ['self', parts[1]] : parts[0] === 'deps' && parts.length === 3 ? [parts[1], parts[2]] : null;
  if (!target) return null;
  const action = dependencyOf(env, target[0])?.action_dependencies?.find(candidate => candidate.key === target[1]);
  if (!action) return null;
  const names = (action.demand?.arg_matches ?? []).map(arg => arg.key).filter((key): key is string => Boolean(key));
  const named = call.named ? names.indexOf(call.named) : -1;
  return {
    label: `${call.callee}(${names.map(key => `${key}: …`).join(', ')})`,
    documentation: 'A task call names every argument.',
    parameters: names.map(key => ({label: key})),
    activeParameter: named >= 0 ? named : Math.min(call.argument, Math.max(0, names.length - 1)),
  };
};
