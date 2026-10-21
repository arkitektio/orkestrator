import { BsxSyntaxError, type BsxRange } from "./source";

/**
 * The expressions inside an `@…` attribute: the subset of Python the
 * reference parser (arkitekt-spec, through `ast.parse(mode="eval")`) turns
 * into a blok — names and attribute chains, calls with positional and keyword
 * arguments, string / number / boolean literals, signed numbers, lists,
 * tuples and dicts. Anything else Python would parse is refused here
 * already, with the same outcome: the attribute does not make a blok.
 */

export type Expr =
  | { type: "name"; id: string; range: BsxRange }
  | { type: "attribute"; value: Expr; attr: string; range: BsxRange }
  | { type: "call"; func: Expr; args: Expr[]; keywords: { arg: string; value: Expr; range: BsxRange }[]; range: BsxRange }
  | { type: "constant"; value: string | number | boolean | null; range: BsxRange }
  | { type: "unary"; op: "-" | "+"; operand: Expr; range: BsxRange }
  | { type: "list" | "tuple"; elements: Expr[]; range: BsxRange }
  | { type: "dict"; keys: Expr[]; values: Expr[]; range: BsxRange };

/** Python's hard keywords: none of them is a name `ast` would accept. */
export const PYTHON_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** `str.isidentifier() and not keyword.iskeyword()`, for ASCII names. */
export const isPythonName = (name: string): boolean => IDENTIFIER.test(name) && !PYTHON_KEYWORDS.has(name);

type Token =
  | { kind: "name"; value: string; range: BsxRange }
  | { kind: "number"; value: number; range: BsxRange }
  | { kind: "string"; value: string; range: BsxRange }
  | { kind: "op"; value: string; range: BsxRange }
  | { kind: "end"; range: BsxRange };

const OPERATORS = ["**", "==", "!=", "<=", ">=", "//", "(", ")", "[", "]", "{", "}", ",", ":", ".", "=", "+", "-", "*", "/", "%", "<", ">", "|", "&", "^", "~", "@"];

const ESCAPES: Record<string, string> = { "\\": "\\", "'": "'", '"': '"', n: "\n", t: "\t", r: "\r", "0": "\0", a: "\x07", b: "\b", f: "\f", v: "\v", "\n": "" };

const tokenize = (text: string, base: number): Token[] => {
  const tokens: Token[] = [];
  let index = 0;
  const fail = (message: string, start = index, end = start + 1): never => {
    throw new BsxSyntaxError(message, { start: base + start, end: base + end });
  };

  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const start = index;
    if (/[A-Za-z_]/.test(char)) {
      while (index < text.length && /[A-Za-z0-9_]/.test(text[index])) index += 1;
      tokens.push({ kind: "name", value: text.slice(start, index), range: { start: base + start, end: base + index } });
      continue;
    }
    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(text[index + 1] ?? ""))) {
      let raw: string;
      if (/^0[xX]/.test(text.slice(index, index + 2))) {
        index += 2;
        while (index < text.length && /[0-9a-fA-F_]/.test(text[index])) index += 1;
        raw = text.slice(start, index).replace(/_/g, "");
        tokens.push({ kind: "number", value: Number.parseInt(raw.slice(2), 16), range: { start: base + start, end: base + index } });
        continue;
      }
      while (index < text.length && /[0-9_]/.test(text[index])) index += 1;
      if (text[index] === ".") {
        index += 1;
        while (index < text.length && /[0-9_]/.test(text[index])) index += 1;
      }
      if (/[eE]/.test(text[index] ?? "")) {
        index += 1;
        if (/[+-]/.test(text[index] ?? "")) index += 1;
        if (!/[0-9]/.test(text[index] ?? "")) fail("Malformed number exponent", start, index);
        while (index < text.length && /[0-9_]/.test(text[index])) index += 1;
      }
      if (/[A-Za-z_]/.test(text[index] ?? "")) fail("Invalid number literal", start, index + 1);
      raw = text.slice(start, index).replace(/_/g, "");
      tokens.push({ kind: "number", value: Number(raw), range: { start: base + start, end: base + index } });
      continue;
    }
    if (char === "'" || char === '"') {
      index += 1;
      let value = "";
      for (;;) {
        if (index >= text.length) fail("Unterminated string literal", start, text.length);
        const current = text[index];
        if (current === char) {
          index += 1;
          break;
        }
        if (current === "\\") {
          const next = text[index + 1];
          if (next === undefined) fail("Unterminated string literal", start, text.length);
          if (next === "x" || next === "u") {
            const width = next === "x" ? 2 : 4;
            const hex = text.slice(index + 2, index + 2 + width);
            if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(hex)) fail("Truncated escape sequence", index, index + 2 + width);
            value += String.fromCharCode(Number.parseInt(hex, 16));
            index += 2 + width;
            continue;
          }
          if (next in ESCAPES) {
            value += ESCAPES[next];
          } else {
            // Python keeps an unknown escape as written.
            value += `\\${next}`;
          }
          index += 2;
          continue;
        }
        value += current;
        index += 1;
      }
      tokens.push({ kind: "string", value, range: { start: base + start, end: base + index } });
      continue;
    }
    const op = OPERATORS.find((candidate) => text.startsWith(candidate, index));
    if (!op) fail(`Unexpected character '${char}'`);
    index += op!.length;
    tokens.push({ kind: "op", value: op!, range: { start: base + start, end: base + index } });
  }
  tokens.push({ kind: "end", range: { start: base + text.length, end: base + text.length } });
  return tokens;
};

const span = (from: BsxRange, to: BsxRange): BsxRange => ({ start: from.start, end: to.end });

/** Parses one expression; `base` is its offset in the document, for ranges. */
export const parseExpression = (text: string, base = 0): Expr => {
  const tokens = tokenize(text, base);
  let at = 0;

  const peek = () => tokens[at];
  const next = () => tokens[at++];
  const isOp = (value: string, token: Token = peek()) => token.kind === "op" && token.value === value;
  const fail = (message: string, token: Token = peek()): never => {
    throw new BsxSyntaxError(message, token.kind === "end" ? { start: token.range.start - 1, end: token.range.start } : token.range);
  };
  const expect = (value: string) => {
    if (!isOp(value)) fail(`Expected '${value}'`);
    return next();
  };

  const parseSequence = (close: string, first: Token): { elements: Expr[]; trailingComma: boolean; end: Token } => {
    const elements: Expr[] = [];
    let trailingComma = false;
    while (!isOp(close)) {
      if (peek().kind === "end") fail(`'${first.kind === "op" ? first.value : ""}' was never closed`, first);
      elements.push(parseTest());
      trailingComma = false;
      if (isOp(",")) {
        next();
        trailingComma = true;
      } else if (!isOp(close)) {
        fail(`Expected ',' or '${close}'`);
      }
    }
    return { elements, trailingComma, end: next() };
  };

  const parseAtom = (): Expr => {
    const token = next();
    if (token.kind === "name") {
      if (token.value === "True" || token.value === "False") return { type: "constant", value: token.value === "True", range: token.range };
      if (token.value === "None") return { type: "constant", value: null, range: token.range };
      if (PYTHON_KEYWORDS.has(token.value)) fail(`'${token.value}' is a Python keyword, not a name`, token);
      return { type: "name", id: token.value, range: token.range };
    }
    if (token.kind === "number") return { type: "constant", value: token.value, range: token.range };
    if (token.kind === "string") return { type: "constant", value: token.value, range: token.range };
    if (token.kind === "op" && token.value === "(") {
      const { elements, trailingComma, end } = parseSequence(")", token);
      if (elements.length === 1 && !trailingComma) return elements[0];
      return { type: "tuple", elements, range: span(token.range, end.range) };
    }
    if (token.kind === "op" && token.value === "[") {
      const { elements, end } = parseSequence("]", token);
      return { type: "list", elements, range: span(token.range, end.range) };
    }
    if (token.kind === "op" && token.value === "{") {
      const keys: Expr[] = [];
      const values: Expr[] = [];
      while (!isOp("}")) {
        if (peek().kind === "end") fail("'{' was never closed", token);
        if (isOp("**")) fail("Dictionaries cannot be unpacked with '**'");
        keys.push(parseTest());
        if (isOp(",") || isOp("}")) fail("Sets are not supported: a dict needs 'key: value'");
        expect(":");
        values.push(parseTest());
        if (isOp(",")) next();
        else if (!isOp("}")) fail("Expected ',' or '}'");
      }
      const end = next();
      return { type: "dict", keys, values, range: span(token.range, end.range) };
    }
    if (token.kind === "end") return fail("Unexpected end of expression", token);
    return fail(`Unexpected '${token.kind === "op" ? token.value : ""}'`, token);
  };

  const parseCallArguments = (open: Token) => {
    const args: Expr[] = [];
    const keywords: { arg: string; value: Expr; range: BsxRange }[] = [];
    while (!isOp(")")) {
      if (peek().kind === "end") fail("'(' was never closed", open);
      if (isOp("**")) fail("Call arguments cannot be unpacked with '**'");
      if (isOp("*")) fail("Call arguments cannot be unpacked with '*'");
      const token = peek();
      const after = tokens[at + 1];
      if (token.kind === "name" && after && isOp("=", after)) {
        if (!isPythonName(token.value)) fail(`'${token.value}' cannot name an argument`, token);
        if (keywords.some((keyword) => keyword.arg === token.value)) fail(`Keyword argument repeated: ${token.value}`, token);
        next();
        next();
        const value = parseTest();
        keywords.push({ arg: token.value, value, range: span(token.range, value.range) });
      } else {
        if (keywords.length > 0) fail("Positional argument follows keyword argument", token);
        args.push(parseTest());
      }
      if (isOp(",")) next();
      else if (!isOp(")")) fail("Expected ',' or ')'");
    }
    return { args, keywords, end: next() };
  };

  const parsePostfix = (): Expr => {
    let expr = parseAtom();
    for (;;) {
      if (isOp(".")) {
        next();
        const name = next();
        if (name.kind !== "name") fail("Expected a name after '.'", name);
        if (PYTHON_KEYWORDS.has((name as { value: string }).value)) fail(`'${(name as { value: string }).value}' is a Python keyword, not a name`, name);
        expr = { type: "attribute", value: expr, attr: (name as { value: string }).value, range: span(expr.range, name.range) };
      } else if (isOp("(")) {
        const open = next();
        const { args, keywords, end } = parseCallArguments(open);
        expr = { type: "call", func: expr, args, keywords, range: span(expr.range, end.range) };
      } else if (isOp("[")) {
        fail("Subscripts are not supported: use a dotted path");
      } else {
        return expr;
      }
    }
  };

  const parseUnary = (): Expr => {
    if (isOp("-") || isOp("+")) {
      const op = next();
      const operand = parseUnary();
      return { type: "unary", op: (op as { value: "-" | "+" }).value, operand, range: span(op.range, operand.range) };
    }
    return parsePostfix();
  };

  const parseTest = (): Expr => {
    const expr = parseUnary();
    const token = peek();
    if (token.kind === "op" && !["(", ")", "[", "]", "{", "}", ",", ":", "=", "."].includes(token.value)) {
      fail(`Operator '${token.value}' is not supported in BSX`);
    }
    if (token.kind === "name" || token.kind === "number" || token.kind === "string") {
      fail("Invalid syntax: two values in a row");
    }
    return expr;
  };

  const first = parseTest();
  if (isOp(",")) {
    const elements = [first];
    while (isOp(",")) {
      next();
      if (peek().kind === "end") break;
      elements.push(parseTest());
    }
    if (peek().kind !== "end") fail("Invalid syntax");
    return { type: "tuple", elements, range: span(first.range, elements[elements.length - 1].range) };
  }
  if (peek().kind !== "end") fail("Invalid syntax");
  return first;
};
