import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentNode,
  BlokComponentProp,
  BlokUtilCall,
} from "../renderer/runtime/types";
import { isPythonName } from "./expr";
import {
  BOUND_CALL_STEP,
  EVENT_ROOT,
  EVENT_SCOPE_KEY,
  FOREACH_COMPONENT,
  FOREACH_LET_PROP,
  STRUCTURE_IDENTIFIER,
} from "./parse";

/**
 * The tree → BSX, the client's port of arkitekt-spec's `to_bsx`
 * (`arkitekt_spec/declare/blok/unparse.py`). The server keeps a blok as a
 * tree, never the text it was written as, so this is how the editor opens
 * one. The contract is `parse(print(tree)) == tree`: a tree BSX cannot
 * express is refused (`BsxPrintError`, naming the node and prop) rather than
 * approximated, since text that parses into a different tree would change
 * the blok silently on the next save.
 */

/** An element whose attributes fit on one line is printed on one line. */
export const LINE_WIDTH = 100;

export class BsxPrintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BsxPrintError";
  }
}

const refuse = (message: string): never => {
  throw new BsxPrintError(message);
};

const identifier = (name: string, where: string): string =>
  isPythonName(name) ? name : refuse(`${where}: '${name}' is not a name BSX can spell.`);

const dotted = (path: string, where: string): string =>
  path
    .split(".")
    .map((part) => identifier(part, where))
    .join(".");

/** Python's `repr` of a string: single quotes unless only double quotes spare escaping. */
export const pythonRepr = (value: string): string => {
  const quote = value.includes("'") && !value.includes('"') ? '"' : "'";
  let out = quote;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (char === "\\") out += "\\\\";
    else if (char === quote) out += `\\${quote}`;
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += `\\x${code.toString(16).padStart(2, "0")}`;
    else out += char;
  }
  return out + quote;
};

const literal = (value: unknown, where: string): string => {
  if (value === null || value === undefined) return refuse(`${where}: an argument without a value; the parser refuses None.`);
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return refuse(`${where}: ${value} has no literal spelling.`);
    return String(value);
  }
  if (typeof value === "string") return pythonRepr(value);
  return refuse(`${where}: the literal ${JSON.stringify(value)} is not a string, number or boolean.`);
};

const argumentPath = (path: string, where: string): string => {
  const [root, ...rest] = path.split(".");
  if (root === EVENT_SCOPE_KEY) return rest.length ? `${EVENT_ROOT}.${dotted(rest.join("."), where)}` : EVENT_ROOT;
  if (root === EVENT_ROOT) return refuse(`${where}: the argument path '${path}' would be read as the triggering event.`);
  return dotted(path, where);
};

const value = (argument: BlokActionArgument, where: string): string => {
  if (argument.agent_call) return agentCall(argument.agent_call, where);
  if (argument.util_call) return utilCall(argument.util_call, where);
  if (argument.value_path != null) return argumentPath(argument.value_path, where);
  if (argument.value_list) return `[${argument.value_list.map((item) => value(item, where)).join(", ")}]`;
  if (argument.value_dict) {
    const entries = argument.value_dict.map((entry) => {
      if (!entry.key) refuse(`${where}: a dict entry without a key.`);
      return `${pythonRepr(entry.key!)}: ${value(entry, where)}`;
    });
    return `{${entries.join(", ")}}`;
  }
  return literal(argument.value_literal, where);
};

/** Positional arguments (keyed `"0"`, `"1"`, …) first and in order, then named ones. */
const callArguments = (args: BlokActionArgument[] | null | undefined, where: string): string => {
  const rendered: string[] = [];
  let expected = 0;
  let named = false;
  for (const argument of args ?? []) {
    if (argument.key == null) refuse(`${where}: a call argument without a key.`);
    const key = argument.key!;
    if (/^\d+$/.test(key)) {
      if (named || Number(key) !== expected) {
        refuse(
          `${where}: positional argument '${key}' is out of order; positional arguments are keyed 0, 1, ... before any named one.`,
        );
      }
      expected += 1;
      rendered.push(value(argument, where));
    } else {
      named = true;
      rendered.push(`${identifier(key, where)}=${value(argument, where)}`);
    }
  }
  return rendered.join(", ");
};

const agentCall = (call: BlokAgentCall, where: string): string => {
  const callee = `${identifier(call.dependency, where)}.${dotted(call.operation, where)}`;
  if (call.dependency === "utils") refuse(`${where}: an agent call on a dependency named 'utils' reads as a utils call.`);
  return `${callee}(${callArguments(call.arguments, where)})`;
};

const utilCall = (call: BlokUtilCall, where: string): string =>
  `utils.${dotted(call.operation, where)}(${callArguments(call.arguments, where)})`;

const propSource = (node: BlokComponentNode, prop: BlokComponentProp): string => {
  const where = `<${node.component}> (${node.id}) prop '${prop.key}'`;

  if (node.component.toLowerCase() === FOREACH_COMPONENT && prop.key === FOREACH_LET_PROP) {
    if (prop.declares_value == null || prop.static_value !== prop.declares_value) {
      refuse(`${where}: a loop variable is declared as both static and declared value.`);
    }
    return `#${prop.declares_value}`;
  }

  if (prop.agent_call) {
    let call = `@${agentCall(prop.agent_call, where)}`;
    if (prop.declares_value != null) call += `.${BOUND_CALL_STEP}(${identifier(prop.declares_value, where)})`;
    return call;
  }
  if (prop.declares_value != null) refuse(`${where}: only a call to an agent or a foreach 'let' can declare a value.`);

  if (prop.util_call) return `@${utilCall(prop.util_call, where)}`;

  if (prop.dynamic_value) {
    if (prop.dynamic_value.literal != null) refuse(`${where}: a dynamic value's fallback literal has no BSX spelling.`);
    if (prop.dynamic_value.path == null) refuse(`${where}: a dynamic value without a path.`);
    return `@${dotted(prop.dynamic_value.path!, where)}`;
  }

  const raw = prop.static_value;
  if (raw === null || raw === undefined) return refuse(`${where}: no value.`);
  if (typeof raw !== "string") {
    return refuse(`${where}: the static value ${JSON.stringify(raw)} is a ${Array.isArray(raw) ? "list" : typeof raw}; BSX attributes are text.`);
  }
  if (raw !== raw.trim()) refuse(`${where}: leading or trailing whitespace in '${raw}' is stripped by the parser.`);
  if (raw.startsWith("$") || (raw.startsWith("@") && !STRUCTURE_IDENTIFIER.test(raw))) {
    refuse(`${where}: the static value '${raw}' would be read as an expression.`);
  }
  return raw;
};

/** An XML attribute, single-quoted when that spares escaping double quotes (JSON values). */
const quote = (raw: string): string => {
  const mark = raw.includes('"') && !raw.includes("'") ? "'" : '"';
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(new RegExp(mark, "g"), mark === '"' ? "&quot;" : "&apos;")
    .replace(/\n/g, "&#10;")
    .replace(/\r/g, "&#13;")
    .replace(/\t/g, "&#9;");
  return `${mark}${escaped}${mark}`;
};

const printNode = (node: BlokComponentNode, structuralId: string, depth: number, indent: number, lines: string[]) => {
  const pad = " ".repeat(indent * depth);
  const attributes: string[] = [];
  if (node.id !== structuralId) attributes.push(`id=${quote(node.id)}`);
  for (const prop of node.props ?? []) {
    if (prop.key === "id") refuse(`<${node.component}> (${node.id}) has a prop named 'id', which BSX reads as the node id.`);
    attributes.push(`${prop.key}=${quote(propSource(node, prop))}`);
  }
  const children = node.children ?? [];

  const oneLine = `${pad}<${node.component}${attributes.map((attribute) => ` ${attribute}`).join("")}`;
  if (oneLine.length <= LINE_WIDTH) {
    lines.push(children.length ? `${oneLine}>` : `${oneLine} />`);
  } else {
    const inner = " ".repeat(indent * (depth + 1));
    lines.push(`${pad}<${node.component}`);
    for (const attribute of attributes) lines.push(`${inner}${attribute}`);
    lines.push(children.length ? `${pad}>` : `${pad}/>`);
  }
  if (!children.length) return;

  const seen = new Map<string, number>();
  for (const child of children) {
    const index = seen.get(child.component) ?? 0;
    seen.set(child.component, index + 1);
    printNode(child, `${node.id}/${child.component}[${index}]`, depth + 1, indent, lines);
  }
  lines.push(`${pad}</${node.component}>`);
};

/** Throws a `BsxPrintError` for a tree BSX cannot express. */
export const printBsx = (node: BlokComponentNode, indent = 2): string => {
  const lines: string[] = [];
  printNode(node, node.component, 0, indent, lines);
  return lines.join("\n");
};
