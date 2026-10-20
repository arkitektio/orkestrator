/**
 * The stubs `validatePythonFlow` checks a source against, read back for the
 * editor: one `async def alias(params) -> T: ...` per manifest action and one
 * `class Name(str)` per structure. Only what completion, signature help and
 * hover need.
 */

export type StubParam = {
  name: string;
  annotation: string;
  optional: boolean;
  keywordOnly: boolean;
};

export type StubFunction = {
  name: string;
  params: StubParam[];
  returns: string;
  /** The parameter list as written, for display. */
  signature: string;
};

export type StubClass = {
  name: string;
  base: string;
  doc: string;
};

export type ParsedStubs = {
  functions: StubFunction[];
  classes: StubClass[];
};

/** Split on commas that are not inside brackets. */
const splitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "[" || char === "(" || char === "{") depth++;
    if (char === "]" || char === ")" || char === "}") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const parseParams = (text: string): StubParam[] => {
  const params: StubParam[] = [];
  let keywordOnly = false;
  for (const part of splitTopLevel(text)) {
    if (part === "*") {
      keywordOnly = true;
      continue;
    }
    if (part === "/") continue;
    const match = /^(\*{0,2}[A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*(.*?))?\s*(=\s*.*)?$/.exec(part);
    if (!match) continue;
    params.push({
      name: match[1],
      annotation: match[2] ?? "Any",
      optional: !!match[3],
      keywordOnly,
    });
  }
  return params;
};

const FUNCTION = /^async def ([A-Za-z_][A-Za-z0-9_]*)\((.*)\)\s*->\s*(.+?):\s*\.\.\.\s*$/gm;
const CLASS = /^class ([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\):\s*\n\s+"""([\s\S]*?)"""/gm;

export const parseStubs = (stubs: string | null | undefined): ParsedStubs => {
  const functions: StubFunction[] = [];
  const classes: StubClass[] = [];
  if (!stubs) return { functions, classes };
  for (const match of stubs.matchAll(FUNCTION)) {
    functions.push({
      name: match[1],
      signature: match[2],
      params: parseParams(match[2]),
      returns: match[3].trim(),
    });
  }
  for (const match of stubs.matchAll(CLASS)) {
    classes.push({ name: match[1], base: match[2].trim(), doc: match[3].trim() });
  }
  return { functions, classes };
};

/** A call skeleton for completion: required parameters as tab stops. */
export const callSnippet = (fn: StubFunction): string => {
  const required = fn.params.filter((param) => !param.optional);
  const parts = required.map((param, index) =>
    param.keywordOnly ? `${param.name}=\${${index + 1}:${param.name}}` : `\${${index + 1}:${param.name}}`,
  );
  return `await ${fn.name}(${parts.join(", ")})`;
};

/** The skeleton a new flow starts from. */
export const NEW_FLOW_SOURCE = `async def main() -> None:
    """Describe what this flow does."""
    pass
`;
