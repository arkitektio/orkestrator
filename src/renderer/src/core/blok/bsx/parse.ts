import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentNode,
  BlokComponentProp,
  BlokUtilCall,
} from "../renderer/runtime/types";
import { isPythonName, parseExpression, type Expr } from "./expr";
import { BsxSyntaxError, type BsxRange } from "./source";
import { parseXml, type XmlElement } from "./xml";

/**
 * BSX → the blok tree, the client's port of arkitekt-spec's `bsx()`
 * (`arkitekt_spec/declare/blok/parser.py`). The rekuest server parses the
 * same text when a blok is saved (`source`) and stays the authority; this
 * one drives the editor's preview, markers and completion, so it follows the
 * reference rule for rule:
 *
 * - a node's id is its structural path (`Card/Button[1]`) unless `id=` says;
 * - inner text is refused (content is a prop: `text="…"`);
 * - `$state.dep.path` is the path `dep.path`;
 * - `@pkg/key` names a kind of structure, so it is the string it reads as;
 * - `@a.b` is a path, `@dep.op(…)` an agent call (`@actions.dep.op(…)` too),
 *   `@utils.op(…)` a util call, and `.into(name)` binds an agent call's task;
 * - `foreach let="#name"` declares the loop variable;
 * - anything else is a static string (stripped).
 *
 * One deliberate difference: the reference names the positional arguments of
 * a base-catalog util call after its parameters; here they keep their index
 * keys (`"0"`, `"1"`), which the runtime maps onto parameters in order
 * (`normalizeFunctionArgs`).
 */

export const BOUND_CALL_STEP = "into";
export const EVENT_ROOT = "event";
export const EVENT_SCOPE_KEY = "$event";
export const FOREACH_COMPONENT = "foreach";
export const FOREACH_LET_PROP = "let";
export const FOREACH_ITEMS_PROP = "items";
export const STRUCTURE_IDENTIFIER = /^@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Where a node and its props are in the source. */
export type BsxNodeSource = {
  node: BlokComponentNode;
  range: BsxRange;
  tagRange: BsxRange;
  props: Map<string, { nameRange: BsxRange; valueRange: BsxRange }>;
};

export type BsxSourceMap = Map<string, BsxNodeSource>;

export type BsxParseResult =
  | { ok: true; tree: BlokComponentNode; sources: BsxSourceMap }
  | { ok: false; error: BsxSyntaxError };

/** Python's `str.strip()`: whitespace at both ends. */
const strip = (value: string) => value.replace(/^\s+|\s+$/g, "");

const fail = (message: string, range: BsxRange): never => {
  throw new BsxSyntaxError(message, range);
};

const extractPath = (expr: Expr): string => {
  if (expr.type === "name") return expr.id;
  if (expr.type === "attribute") return `${extractPath(expr.value)}.${expr.attr}`;
  return fail(`Cannot read a path from ${expr.type === "call" ? "a call" : `a ${expr.type}`}`, expr.range);
};

const argumentPath = (expr: Expr): string => {
  const path = extractPath(expr);
  const [root, ...rest] = path.split(".");
  if (root === EVENT_ROOT) return rest.length ? `${EVENT_SCOPE_KEY}.${rest.join(".")}` : EVENT_SCOPE_KEY;
  return path;
};

const parseArgument = (expr: Expr, key: string | null): BlokActionArgument => {
  const keyed = key === null ? {} : { key };
  switch (expr.type) {
    case "constant":
      if (expr.value === null) {
        fail(
          `Argument '${key ?? "item"}' cannot be None: a missing literal is indistinguishable from no value. Omit the argument instead.`,
          expr.range,
        );
      }
      return { ...keyed, value_literal: expr.value };
    case "unary":
      if (expr.operand.type === "constant" && typeof expr.operand.value === "number") {
        return { ...keyed, value_literal: expr.op === "-" ? -expr.operand.value : expr.operand.value };
      }
      return fail(`Unsupported argument '${key ?? "item"}': only a number can be signed`, expr.range);
    case "name":
    case "attribute":
      return { ...keyed, value_path: argumentPath(expr) };
    case "call": {
      const call = parseCall(expr);
      return "dependency" in call ? { ...keyed, agent_call: call } : { ...keyed, util_call: call };
    }
    case "list":
    case "tuple":
      return { ...keyed, value_list: expr.elements.map((element) => parseArgument(element, null)) };
    case "dict":
      return {
        ...keyed,
        value_dict: expr.keys.map((entryKey, index) => {
          if (entryKey.type !== "constant" || typeof entryKey.value !== "string" || !entryKey.value) {
            fail("Dictionary keys must be non-empty literal strings.", entryKey.range);
          }
          return parseArgument(expr.values[index], (entryKey as { value: string }).value);
        }),
      };
  }
};

const parseCallArguments = (expr: Extract<Expr, { type: "call" }>): BlokActionArgument[] => [
  ...expr.args.map((arg, index) => parseArgument(arg, String(index))),
  ...expr.keywords.map((keyword) => parseArgument(keyword.value, keyword.arg)),
];

const parseCall = (expr: Extract<Expr, { type: "call" }>): BlokAgentCall | BlokUtilCall => {
  const fullPath = extractPath(expr.func);
  const parts = fullPath.split(".");
  const args = parseCallArguments(expr);
  const withArguments = args.length ? { arguments: args } : {};

  if (parts[0] === "utils") {
    if (parts.length < 2) fail(`Invalid utils namespace: '${fullPath}'.`, expr.func.range);
    return { operation: parts.slice(1).join("."), ...withArguments };
  }
  if (parts[0] === "actions") {
    if (parts.length < 3) fail(`Invalid action namespace: '${fullPath}'. Expected: actions.dependency.operation`, expr.func.range);
    return { dependency: parts[1], operation: parts.slice(2).join("."), ...withArguments };
  }
  if (parts.length < 2) {
    fail(`Action calls must begin with a dependency key or 'utils.'. Got: '${fullPath}'`, expr.func.range);
  }
  return { dependency: parts[0], operation: parts.slice(1).join("."), ...withArguments };
};

/** `dep.op(…).into(name)`: the call, and the name its task is bound to. */
const boundCall = (expr: Extract<Expr, { type: "call" }>, source: string): { call: BlokAgentCall; name: string } | null => {
  const func = expr.func;
  if (!(func.type === "attribute" && func.attr === BOUND_CALL_STEP && func.value.type === "call")) return null;
  if (expr.keywords.length || expr.args.length !== 1 || expr.args[0].type !== "name") {
    fail(
      `'.${BOUND_CALL_STEP}(...)' takes one bare name, the value the call's task is bound to, e.g. '.${BOUND_CALL_STEP}(run)'. Got: ${source}`,
      expr.range,
    );
  }
  const call = parseCall(func.value);
  if (!("dependency" in call)) {
    fail(
      `Only a call to an agent runs as a task that can be bound with '.${BOUND_CALL_STEP}(...)'; a utils call returns at once. Got: ${source}`,
      expr.range,
    );
  }
  return { call: call as BlokAgentCall, name: (expr.args[0] as { id: string }).id };
};

const isForeachLet = (component: string, key: string) =>
  component.toLowerCase() === FOREACH_COMPONENT && key === FOREACH_LET_PROP;

/** One attribute → one prop. `valueStart` is where the (unstripped) value begins. */
export const parseBsxProp = (component: string, key: string, raw: string, valueStart = 0): BlokComponentProp => {
  const leading = raw.length - raw.replace(/^\s+/, "").length;
  const value = strip(raw);
  const base = valueStart + leading;
  const whole = { start: base, end: base + value.length };

  if (value.startsWith("$")) {
    const parts = value.slice(1).split(".");
    if (parts.length < 3 || parts[0] !== "state") {
      fail(
        `Invalid state namespace for dynamic value prop '${key}': '${value.slice(1)}'. Expected format: state.dependency_key.nested_path`,
        whole,
      );
    }
    return { key, dynamic_value: { path: parts.slice(1).join(".") } };
  }

  if (STRUCTURE_IDENTIFIER.test(value)) return { key, static_value: value };

  if (value.startsWith("@")) {
    const source = value.slice(1);
    const expr = parseExpression(source, base + 1);
    if (expr.type === "name" || expr.type === "attribute") {
      return { key, dynamic_value: { path: extractPath(expr) } };
    }
    if (expr.type !== "call") fail(`Dynamic expression must be a path or function call. Got: ${source}`, whole);
    const call = expr as Extract<Expr, { type: "call" }>;
    const bound = boundCall(call, source);
    if (bound) return { key, agent_call: bound.call, declares_value: bound.name };
    const parsed = parseCall(call);
    return "dependency" in parsed ? { key, agent_call: parsed } : { key, util_call: parsed };
  }

  if (isForeachLet(component, key)) {
    const declared = value.startsWith("#") ? value.slice(1) : "";
    if (!declared || !isPythonName(declared)) {
      fail(`<${component}> prop '${key}' must declare a loop variable as '#name', where name is a valid identifier. Got: '${value}'`, whole);
    }
    return { key, static_value: declared, declares_value: declared };
  }

  return { key, static_value: value };
};

const rejectText = (element: XmlElement, nodeId: string) => {
  for (const text of element.texts) {
    const content = strip(text.text);
    if (!content) continue;
    const at = text.range.start + (text.text.length - text.text.replace(/^\s+/, "").length);
    fail(
      `Text content is not rendered in <${element.tag}> (${nodeId}): '${content}'. Pass it as a prop instead, e.g. <${element.tag} text="${content}" />`,
      { start: at, end: at + content.length },
    );
  }
};

const parseElement = (element: XmlElement, path: string, sources: BsxSourceMap): BlokComponentNode => {
  const idAttribute = element.attributes.find((attribute) => attribute.name === "id");
  const nodeId = idAttribute?.value || path;

  rejectText(element, nodeId);

  const propSources = new Map<string, { nameRange: BsxRange; valueRange: BsxRange }>();
  const props: BlokComponentProp[] = [];
  for (const attribute of element.attributes) {
    if (attribute.name === "id") continue;
    props.push(parseBsxProp(element.tag, attribute.name, attribute.value, attribute.valueRange.start));
    propSources.set(attribute.name, { nameRange: attribute.nameRange, valueRange: attribute.valueRange });
  }

  const seen = new Map<string, number>();
  const children = element.children.map((child) => {
    const index = seen.get(child.tag) ?? 0;
    seen.set(child.tag, index + 1);
    return parseElement(child, `${nodeId}/${child.tag}[${index}]`, sources);
  });

  const node: BlokComponentNode = {
    id: nodeId,
    component: element.tag,
    ...(props.length ? { props } : {}),
    ...(children.length ? { children } : {}),
  };
  if (!sources.has(nodeId)) {
    sources.set(nodeId, { node, range: element.range, tagRange: element.tagRange, props: propSources });
  }
  return node;
};

/** Throws a `BsxSyntaxError`; `parseBsxSafe` returns it instead. */
export const parseBsx = (source: string): { tree: BlokComponentNode; sources: BsxSourceMap } => {
  const root = parseXml(source);
  const sources: BsxSourceMap = new Map();
  const tree = parseElement(root, root.tag, sources);
  return { tree, sources };
};

export const parseBsxSafe = (source: string): BsxParseResult => {
  try {
    return { ok: true, ...parseBsx(source) };
  } catch (error) {
    if (error instanceof BsxSyntaxError) return { ok: false, error };
    throw error;
  }
};
