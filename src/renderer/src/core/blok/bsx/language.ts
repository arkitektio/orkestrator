import type { BlokComponentContext } from "../renderer/runtime/components";
import {
  CONTEXT_ROOT,
  RENDER_CONTEXT,
  childContextOf,
  fitsUnder,
  type BsxBlokContext,
  type BsxCatalogView,
  type BsxComponentInfo,
  type BsxFunctionInfo,
  type BsxPropInfo,
} from "./catalogView";
import { BOUND_CALL_STEP, FOREACH_COMPONENT, FOREACH_LET_PROP } from "./parse";
import { ARGS_ROOT, type BsxDependency } from "./references";
import type { BsxRange } from "./source";

/**
 * What the editor offers at the cursor, worked out from the text alone (it
 * need not parse: the author is mid-word) and the catalog. No editor types:
 * the Monaco surface (`core/blok/editor`) maps these onto its providers.
 */

export type BsxEnvironment = {
  catalog: BsxCatalogView;
  context: BsxBlokContext;
  dependencies: readonly BsxDependency[];
  args: readonly string[];
  /** The blok's own UI state (the demo state's own keys). */
  localRoots?: readonly string[];
};

export type BsxCompletionKind = "component" | "prop" | "value" | "dependency" | "path" | "function" | "action" | "keyword" | "close";

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

type OpenElement = { tag: string; attributes: Map<string, string> };

export type BsxCursor =
  | { kind: "tag"; prefix: string; from: number; stack: OpenElement[] }
  | { kind: "close"; prefix: string; from: number; stack: OpenElement[] }
  | { kind: "attrName"; prefix: string; from: number; tag: string; present: Set<string>; stack: OpenElement[] }
  | { kind: "attrValue"; tag: string; attr: string; value: string; from: number; present: Set<string>; stack: OpenElement[] }
  | { kind: "text"; stack: OpenElement[] }
  | { kind: "none" };

const NAME_CHAR = /[A-Za-z0-9_:.\-]/;
const isSpace = (char: string | undefined) => char !== undefined && /\s/.test(char);

/** Attribute names written after the cursor, up to the end of the tag. */
const attributesAhead = (text: string, offset: number): string[] => {
  const names: string[] = [];
  let quote: string | null = null;
  let end = offset;
  for (; end < text.length; end += 1) {
    const char = text[end];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">" || char === "<") {
      break;
    }
  }
  const ahead = text.slice(offset, end).replace(/"[^"]*"|'[^']*'/g, '""');
  for (const match of ahead.matchAll(/([A-Za-z_][\w:.\-]*)\s*=/g)) names.push(match[1]);
  return names;
};

/** Where the cursor is: in a tag name, an attribute name or value, or between elements. */
export const scanCursor = (text: string, offset: number): BsxCursor => {
  const stack: OpenElement[] = [];
  let index = 0;

  while (index < offset) {
    if (text.startsWith("<!--", index)) {
      const end = text.indexOf("-->", index + 4);
      if (end < 0 || end + 3 > offset) return { kind: "none" };
      index = end + 3;
      continue;
    }
    if (text[index] !== "<") {
      index += 1;
      continue;
    }

    if (text[index + 1] === "?" || text[index + 1] === "!") {
      const end = text.indexOf(">", index);
      if (end < 0 || end >= offset) return { kind: "none" };
      index = end + 1;
      continue;
    }

    if (text[index + 1] === "/") {
      let end = index + 2;
      while (end < offset && NAME_CHAR.test(text[end])) end += 1;
      if (end >= offset) return { kind: "close", prefix: text.slice(index + 2, offset), from: index + 2, stack };
      const name = text.slice(index + 2, end);
      const at = stack.map((element) => element.tag).lastIndexOf(name);
      if (at >= 0) stack.splice(at);
      const close = text.indexOf(">", end);
      if (close < 0 || close >= offset) return { kind: "none" };
      index = close + 1;
      continue;
    }

    let cursor = index + 1;
    while (cursor < offset && NAME_CHAR.test(text[cursor])) cursor += 1;
    if (cursor >= offset) return { kind: "tag", prefix: text.slice(index + 1, offset), from: index + 1, stack };
    const tag = text.slice(index + 1, cursor);
    const attributes = new Map<string, string>();
    const present = () => new Set([...attributes.keys(), ...attributesAhead(text, offset)]);

    for (;;) {
      const before = cursor;
      while (cursor < offset && isSpace(text[cursor])) cursor += 1;
      if (cursor >= offset) {
        if (cursor === before) return { kind: "none" };
        return { kind: "attrName", prefix: "", from: offset, tag, present: present(), stack };
      }
      if (text[cursor] === "/" && text[cursor + 1] === ">") {
        cursor += 2;
        break;
      }
      if (text[cursor] === ">") {
        cursor += 1;
        stack.push({ tag, attributes });
        break;
      }
      const nameStart = cursor;
      while (cursor < offset && NAME_CHAR.test(text[cursor])) cursor += 1;
      if (cursor >= offset) {
        return { kind: "attrName", prefix: text.slice(nameStart, offset), from: nameStart, tag, present: present(), stack };
      }
      if (cursor === nameStart) {
        cursor += 1;
        continue;
      }
      const name = text.slice(nameStart, cursor);
      while (cursor < offset && isSpace(text[cursor])) cursor += 1;
      if (cursor >= offset) return { kind: "none" };
      if (text[cursor] !== "=") {
        attributes.set(name, "");
        continue;
      }
      cursor += 1;
      while (cursor < offset && isSpace(text[cursor])) cursor += 1;
      if (cursor >= offset) return { kind: "none" };
      const quote = text[cursor];
      if (quote !== '"' && quote !== "'") continue;
      const valueStart = cursor + 1;
      const valueEnd = text.indexOf(quote, valueStart);
      if (valueEnd < 0 || valueEnd >= offset) {
        return {
          kind: "attrValue",
          tag,
          attr: name,
          value: text.slice(valueStart, offset),
          from: valueStart,
          present: present(),
          stack,
        };
      }
      attributes.set(name, text.slice(valueStart, valueEnd));
      cursor = valueEnd + 1;
    }
    index = cursor;
  }
  return { kind: "text", stack };
};

const contextAt = (env: BsxEnvironment, stack: readonly OpenElement[]): BlokComponentContext =>
  stack.reduce<BlokComponentContext>(
    (context, element) => childContextOf(env.catalog.components.get(element.tag), context),
    RENDER_CONTEXT[env.context],
  );

const KIND_LABEL: Record<BsxPropInfo["kind"], string> = {
  action: "action",
  string: "string",
  int: "int",
  float: "number",
  bool: "boolean",
  list: "list",
  dict: "dict",
  asset: "asset",
  any: "any",
};

export const describeProp = (prop: BsxPropInfo): string =>
  [
    `**${prop.key}**: ${KIND_LABEL[prop.kind]}${prop.required ? " (required)" : ""}`,
    prop.description ?? "",
    prop.values.length ? `One of: ${prop.values.map((value) => `\`${value}\``).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

export const describeComponent = (component: BsxComponentInfo): string => {
  const required = component.props.filter((prop) => prop.required).map((prop) => prop.key);
  return [
    `**<${component.name}>**`,
    component.description ?? "",
    required.length ? `Requires: ${required.map((key) => `\`${key}\``).join(", ")}` : "",
    component.downstreamOf.length ? `Inside: ${component.downstreamOf.map((name) => `\`${name}\``).join(" or ")}` : "",
    component.acceptsChildren ? "Takes children." : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const signatureOf = (fn: BsxFunctionInfo): string =>
  fn.variadic ? `${fn.name}(...values)` : `${fn.name}(${fn.params.map((param) => `${param.key}${param.required ? "" : "?"}`).join(", ")})`;

const snippetValue = (prop: BsxPropInfo, index: number): string => {
  if (prop.kind === "action") return `"@\${${index}}"`;
  // A short enum is a choice; a long one (icons) is offered as completions inside the quotes.
  if (prop.values.length && prop.values.length <= 12) {
    return `"\${${index}|${prop.values.map((value) => value.replace(/[,|]/g, "")).join(",")}|}"`;
  }
  return `"\${${index}}"`;
};

const componentCompletion = (component: BsxComponentInfo, from: number): BsxCompletion => {
  const required = component.props.filter((prop) => prop.required);
  const attributes = required.map((prop, index) => ` ${prop.key}=${snippetValue(prop, index + 1)}`).join("");
  return {
    label: component.name,
    insertText: component.acceptsChildren
      ? `${component.name}${attributes}>\n\t$0\n</${component.name}>`
      : `${component.name}${attributes} />`,
    snippet: true,
    kind: "component",
    detail: component.description?.split(/(?<=\.)\s/)[0] ?? undefined,
    documentation: describeComponent(component),
    from,
  };
};

const completeTag = (env: BsxEnvironment, cursor: Extract<BsxCursor, { kind: "tag" }>): BsxCompletion[] => {
  const { stack, from } = cursor;
  const components = [...env.catalog.components.values()];

  if (stack.length === 0) {
    const root = CONTEXT_ROOT[env.context];
    const candidates = root
      ? components.filter((component) => component.name === root)
      : components.filter((component) => fitsUnder(component, [], RENDER_CONTEXT[env.context]));
    return candidates.map((component) => componentCompletion(component, from));
  }

  const parent = env.catalog.components.get(stack[stack.length - 1].tag);
  if (parent && !parent.acceptsChildren) return [];
  const ancestors = stack.map((element) => element.tag);
  const context = contextAt(env, stack);
  return components
    .filter((component) => fitsUnder(component, ancestors, context))
    .map((component) => ({
      ...componentCompletion(component, from),
      // What can only sit here (a part of its parent) comes first.
      sortText: `${component.downstreamOf.length ? "0" : "1"}${component.name}`,
    }));
};

const completeAttributeName = (env: BsxEnvironment, cursor: Extract<BsxCursor, { kind: "attrName" }>): BsxCompletion[] => {
  const component = env.catalog.components.get(cursor.tag);
  const items: BsxCompletion[] = (component?.props ?? [])
    .filter((prop) => !cursor.present.has(prop.key))
    .map((prop, index) => ({
      label: prop.key,
      insertText: `${prop.key}=${snippetValue(prop, 1)}`,
      snippet: true,
      kind: "prop" as const,
      detail: `${KIND_LABEL[prop.kind]}${prop.required ? " · required" : ""}`,
      documentation: describeProp(prop),
      from: cursor.from,
      sortText: `${prop.required ? "0" : "1"}${String(index).padStart(3, "0")}`,
    }));
  if (!cursor.present.has("id")) {
    items.push({
      label: "id",
      insertText: 'id="$1"',
      snippet: true,
      kind: "prop",
      detail: "node id",
      documentation: "The node's id, in place of its structural path. Ids are global: a gradient or a clip path is referenced by it.",
      from: cursor.from,
      sortText: "2id",
    });
  }
  return items;
};

/** The unclosed `(` the cursor is inside, if any, and how many commas precede it at its depth. */
const openCall = (expression: string): { callee: string; argument: number } | null => {
  let quote: string | null = null;
  const opens: { at: number; commas: number }[] = [];
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[" || char === "{") opens.push({ at: index, commas: char === "(" ? 0 : -1 });
    else if (char === ")" || char === "]" || char === "}") opens.pop();
    else if (char === "," && opens.length && opens[opens.length - 1].commas >= 0) opens[opens.length - 1].commas += 1;
  }
  const call = [...opens].reverse().find((open) => open.commas >= 0);
  if (!call) return null;
  const callee = /([A-Za-z_][\w.]*)\s*$/.exec(expression.slice(0, call.at));
  return callee ? { callee: callee[1], argument: call.commas } : null;
};

const inString = (expression: string): boolean => {
  let quote: string | null = null;
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    }
  }
  return quote !== null;
};

const depthOf = (expression: string): number => {
  let depth = 0;
  for (const char of expression.replace(/"[^"]*"|'[^']*'/g, "")) {
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
  }
  return depth;
};

const TASK_FIELDS = ["status", "running", "done", "failed", "progress", "message", "error", "result", "returns"];

const boundNames = (text: string): string[] => [
  ...new Set([...text.matchAll(new RegExp(`\\.${BOUND_CALL_STEP}\\(\\s*([A-Za-z_]\\w*)\\s*\\)`, "g"))].map((match) => match[1])),
];

const foreachLocals = (stack: readonly OpenElement[]): string[] =>
  stack
    .filter((element) => element.tag.toLowerCase() === FOREACH_COMPONENT)
    .map((element) => element.attributes.get(FOREACH_LET_PROP)?.replace(/^#/, "") ?? "")
    .filter(Boolean);

const completeExpression = (
  env: BsxEnvironment,
  text: string,
  cursor: Extract<BsxCursor, { kind: "attrValue" }>,
  prop: BsxPropInfo | undefined,
  expression: string,
  end: number,
): BsxCompletion[] => {
  if (inString(expression)) return [];
  const isAction = prop?.kind === "action";
  const depth = depthOf(expression);
  const item = (
    label: string,
    kind: BsxCompletionKind,
    detail?: string,
    documentation?: string,
    insertText = label,
    snippet = false,
  ): BsxCompletion => ({ label, insertText, snippet, kind, detail, documentation, from: end - partial.length });

  if (/\)\.\w*$/.test(expression)) {
    const partial = /(\w*)$/.exec(expression)![1];
    if (!isAction || depth > 0) return [];
    return [
      {
        label: BOUND_CALL_STEP,
        insertText: `${BOUND_CALL_STEP}(\${1:run})`,
        snippet: true,
        kind: "keyword",
        detail: "bind the call's task to a name",
        documentation: "`.into(name)` keeps what the call is doing and what it returned under `name`: read `@name.running`, `@name.result`, …",
        from: end - partial.length,
      },
    ];
  }

  const match = /((?:[A-Za-z_]\w*\.)*)([A-Za-z_]\w*)?$/.exec(expression)!;
  const chain = match[1] ? match[1].slice(0, -1).split(".") : [];
  const partial = match[2] ?? "";
  const before = expression.slice(0, expression.length - match[0].length);
  if (/[\w)\]}'"]$/.test(before)) return [];

  const dependencyByKey = new Map(env.dependencies.map((dependency) => [dependency.key, dependency]));
  for (const dependency of env.dependencies) if (dependency.app) dependencyByKey.set(dependency.app, dependency);
  const calls = isAction || depth > 0;
  const actionsOf = (dependency: BsxDependency) =>
    (dependency.actions ?? []).map((action) =>
      item(action, "action", `action of ${dependency.key}`, undefined, `${action}($1)`, true),
    );
  const statesOf = (dependency: BsxDependency) =>
    (dependency.states ?? []).map((state) => item(state, "path", `state of ${dependency.key}`));

  if (chain.length === 0) {
    const items: BsxCompletion[] = [];
    for (const dependency of env.dependencies) {
      items.push(item(dependency.key, "dependency", dependency.app ? `dependency · ${dependency.app}` : "dependency"));
    }
    if (env.args.length) items.push(item(ARGS_ROOT, "keyword", "what the blok is opened for"));
    items.push(item("utils", "keyword", "util functions"));
    items.push(item("state", "keyword", "a dependency's state, by state name"));
    for (const name of boundNames(text)) items.push(item(name, "path", "a bound call's task"));
    for (const name of foreachLocals(cursor.stack)) items.push(item(name, "path", "foreach item"));
    for (const name of env.localRoots ?? []) items.push(item(name, "path", "the blok's own state"));
    if (depth > 0 && isAction) items.push(item("event", "keyword", "the value that triggered the handler"));
    if (depth > 0) {
      items.push(item("True", "keyword"));
      items.push(item("False", "keyword"));
    }
    return items;
  }

  const [first, second] = chain;
  if (chain.length === 1) {
    if (first === "utils") {
      return [...new Map([...env.catalog.functions.values()].map((fn) => [fn.name, fn])).values()]
        .filter((fn) => fn.pure || isAction)
        .map((fn) => item(fn.name, "function", signatureOf(fn), fn.description ?? undefined, `${fn.name}($1)`, true));
    }
    if (first === ARGS_ROOT) return env.args.map((arg) => item(arg, "path", "arg"));
    if (first === "state") return env.dependencies.map((dependency) => item(dependency.key, "dependency", "dependency"));
    if (first === "actions") return env.dependencies.map((dependency) => item(dependency.key, "dependency", "dependency"));
    if (boundNames(text).includes(first)) return TASK_FIELDS.map((field) => item(field, "path", "task record"));
    const dependency = dependencyByKey.get(first);
    if (dependency) {
      return [
        ...(calls ? actionsOf(dependency) : []),
        ...statesOf(dependency),
        item("assets", "keyword", "files its app registered"),
      ];
    }
    return [];
  }

  if (chain.length === 2) {
    if (first === "state" || first === "actions") {
      const dependency = dependencyByKey.get(second);
      if (!dependency) return [];
      return first === "state" ? statesOf(dependency) : actionsOf(dependency);
    }
    const dependency = dependencyByKey.get(first);
    if (dependency && !calls && (dependency.actions ?? []).includes(second)) {
      return [item("latest", "keyword", "the task it last ran as")];
    }
  }
  return [];
};

const completeAttributeValue = (env: BsxEnvironment, text: string, cursor: Extract<BsxCursor, { kind: "attrValue" }>): BsxCompletion[] => {
  const component = env.catalog.components.get(cursor.tag);
  const prop = component?.props.find((candidate) => candidate.key === cursor.attr);
  const end = cursor.from + cursor.value.length;
  const leading = cursor.value.length - cursor.value.replace(/^\s+/, "").length;
  const value = cursor.value.slice(leading);

  if (cursor.attr === FOREACH_LET_PROP && cursor.tag.toLowerCase() === FOREACH_COMPONENT) return [];

  if (value.startsWith("@")) return completeExpression(env, text, cursor, prop, value.slice(1), end);

  if (value.startsWith("$")) {
    const parts = value.slice(1).split(".");
    const partial = parts.pop() ?? "";
    const from = end - partial.length;
    if (parts.length === 0) return [{ label: "state", insertText: "state.", snippet: false, kind: "keyword", from }];
    if (parts.length === 1 && parts[0] === "state") {
      return env.dependencies.map((dependency) => ({ label: dependency.key, insertText: dependency.key, snippet: false, kind: "dependency", from }));
    }
    if (parts.length === 2 && parts[0] === "state") {
      const dependency = env.dependencies.find((candidate) => candidate.key === parts[1]);
      return (dependency?.states ?? []).map((state) => ({ label: state, insertText: state, snippet: false, kind: "path", from }));
    }
    return [];
  }

  const from = cursor.from + leading;
  const items: BsxCompletion[] = (prop?.values ?? []).map((option) => ({
    label: option,
    insertText: option,
    snippet: false,
    kind: "value",
    detail: prop?.key,
    from,
  }));
  if (value === "" && prop && prop.kind !== "string") {
    items.push({
      label: "@",
      insertText: "@",
      snippet: false,
      kind: "keyword",
      detail: prop.kind === "action" ? "call an action" : "read a value",
      from,
    });
  }
  return items;
};

export const completeBsx = (text: string, offset: number, env: BsxEnvironment): BsxCompletion[] => {
  const cursor = scanCursor(text, offset);
  switch (cursor.kind) {
    case "tag":
      return completeTag(env, cursor);
    case "close": {
      const open = cursor.stack[cursor.stack.length - 1];
      if (!open) return [];
      return [{ label: `/${open.tag}`, insertText: `${open.tag}>`, snippet: false, kind: "close", from: cursor.from }];
    }
    case "attrName":
      return completeAttributeName(env, cursor);
    case "attrValue":
      return completeAttributeValue(env, text, cursor);
    default:
      return [];
  }
};

const wordAt = (text: string, offset: number): BsxRange | null => {
  let start = offset;
  let end = offset;
  while (start > 0 && /[\w\-]/.test(text[start - 1])) start -= 1;
  while (end < text.length && /[\w\-]/.test(text[end])) end += 1;
  return end > start ? { start, end } : null;
};

/** What the word under the cursor is: a component, a prop, or a util function. */
export const hoverBsx = (text: string, offset: number, env: BsxEnvironment): { contents: string; range: BsxRange } | null => {
  const word = wordAt(text, offset);
  if (!word) return null;
  const name = text.slice(word.start, word.end);
  const cursor = scanCursor(text, word.end);

  if (cursor.kind === "tag" || cursor.kind === "close") {
    const component = env.catalog.components.get(name);
    return component ? { contents: describeComponent(component), range: word } : null;
  }
  if (cursor.kind === "attrName") {
    const prop = env.catalog.components.get(cursor.tag)?.props.find((candidate) => candidate.key === name);
    return prop ? { contents: describeProp(prop), range: word } : null;
  }
  if (cursor.kind === "attrValue" && text.slice(Math.max(0, word.start - 6), word.start) === "utils.") {
    const fn = env.catalog.functions.get(name);
    if (!fn) return null;
    return {
      contents: [`**${signatureOf(fn)}**`, fn.description ?? "", ...fn.params.map(describeProp)].filter(Boolean).join("\n\n"),
      range: word,
    };
  }
  return null;
};

export type BsxSignature = {
  label: string;
  documentation?: string;
  parameters: { label: string; documentation?: string }[];
  activeParameter: number;
};

/** Inside `@utils.fn(…)`: the function's parameters and which one the cursor is on. */
export const signatureBsx = (text: string, offset: number, env: BsxEnvironment): BsxSignature | null => {
  const cursor = scanCursor(text, offset);
  if (cursor.kind !== "attrValue") return null;
  const value = cursor.value.replace(/^\s+/, "");
  if (!value.startsWith("@")) return null;
  const call = openCall(value.slice(1));
  if (!call || !call.callee.startsWith("utils.")) return null;
  const fn = env.catalog.functions.get(call.callee.slice("utils.".length));
  if (!fn) return null;
  const parameters = fn.variadic
    ? [{ label: "...values", documentation: fn.description ?? undefined }]
    : fn.params.map((param) => ({ label: param.key, documentation: describeProp(param) }));
  return {
    label: signatureOf(fn),
    documentation: fn.description ?? undefined,
    parameters,
    activeParameter: fn.variadic ? 0 : Math.min(call.argument, Math.max(0, parameters.length - 1)),
  };
};
