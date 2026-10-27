import {BsxSyntaxError} from './source';

/**
 * The blok expression language, version 2: a small JavaScript subset, parsed
 * by hand. The port of arkitekt-spec's `arkitekt_spec/blok/expr.py`; the Rust
 * (takt) and Python parsers implement the same grammar and all three are held
 * to one corpus (`core/blok/spec/bsx_v2.json`):
 *
 *     callback   := expression ('into' name)?
 *     expression := ternary
 *     ternary    := coalesce ('?' expression ':' expression)?
 *     coalesce   := or ('??' or)*
 *     or         := and ('||' and)*
 *     and        := equality ('&&' equality)*
 *     equality   := relation (('==' | '!=') relation)?
 *     relation   := unary (('>' | '>=' | '<' | '<=') unary)?
 *     unary      := '!' unary | '-' number | primary
 *     primary    := literal | path | call | list | object | '(' expression ')'
 *     path       := name ('.' name)*
 *     call       := path '(' (argument (',' argument)* ','?)? ')'
 *     argument   := name ':' expression | expression
 *     list       := '[' (expression (',' expression)* ','?)? ']'
 *     object     := '{' ((name | string) ':' expression (',' ...)* ','?)? '}'
 *     literal    := number | string | 'true' | 'false' | 'null'
 *
 * Offsets are UTF-16 indices into the whole source (what an editor marks);
 * a refusal's line and column are counted in code points, as the corpus does.
 */

export type Scalar = null | boolean | number | string;

export type Literal = {type: 'literal'; value: Scalar; offset: number};
export type ListExpr = {type: 'list'; items: Expr[]; offset: number};
export type ObjectExpr = {type: 'object'; entries: Array<[string, Expr]>; offset: number};
export type PathExpr = {type: 'path'; segments: string[]; offset: number};
export type Argument = {name: string | null; value: Expr; offset: number};
export type CallExpr = {type: 'call'; callee: string[]; arguments: Argument[]; offset: number};
export type NotExpr = {type: 'not'; operand: Expr; offset: number};
export type CompareExpr = {type: 'compare'; operator: string; left: Expr; right: Expr; offset: number};
/** `a && b && c`, `a || b` or `a ?? b`: one operator over every operand (a parenthesized group stays one operand). */
export type LogicalOperator = '&&' | '||' | '??';
export type LogicalExpr = {type: 'logical'; operator: LogicalOperator; operands: Expr[]; offset: number};
export type TernaryExpr = {type: 'ternary'; cond: Expr; then: Expr; otherwise: Expr; offset: number};
export type IntoExpr = {type: 'into'; call: CallExpr; name: string; offset: number};

export type Expr =
  | Literal
  | ListExpr
  | ObjectExpr
  | PathExpr
  | CallExpr
  | NotExpr
  | CompareExpr
  | LogicalExpr
  | TernaryExpr
  | IntoExpr;

export const dotted = (path: PathExpr): string => path.segments.join('.');
export const calleeName = (call: CallExpr): string => call.callee.join('.');

/* -------------------------------------------------------------------------- */
/* Positions                                                                  */
/* -------------------------------------------------------------------------- */

/** Turns a UTF-16 offset into the whole source into a 1-based line and code-point column. */
export class Locator {
  private readonly starts: number[] = [0];

  constructor(readonly source: string) {
    for (let index = 0; index < source.length; index += 1) {
      if (source.charCodeAt(index) === 10) this.starts.push(index + 1);
    }
  }

  locate(offset: number): {line: number; column: number} {
    let low = 0;
    let high = this.starts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.starts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    const start = this.starts[low];
    // Code points, not UTF-16 units: the corpus counts the way Python and Rust index.
    const column = [...this.source.slice(start, Math.max(start, offset))].length + 1;
    return {line: low + 1, column};
  }
}

/** A refusal: a vocabulary code, where it is, and the fields its message is filled with. */
export const blokError = (
  locator: Locator,
  code: string,
  offset: number,
  fields: Readonly<Record<string, unknown>> = {},
  end?: number,
): BsxSyntaxError => {
  const {line, column} = locator.locate(offset);
  return new BsxSyntaxError({code, fields, line, column, range: {start: offset, end: Math.max(end ?? offset + 1, offset)}});
};

/* -------------------------------------------------------------------------- */
/* Tokens                                                                     */
/* -------------------------------------------------------------------------- */

type Token = {kind: 'name' | 'number' | 'string' | 'op' | 'end'; value: string; offset: number; literal: Scalar};

const OPERATORS = [
  '===', '!==', '=>', '==', '!=', '>=', '<=', '&&', '||', '??', '?.', '**',
  '(', ')', '[', ']', '{', '}', ',', ':', '.', '?', '!', '>', '<', '=', ';',
  '+', '-', '*', '/', '%', '&', '|', '^', '~', '`',
];
const ESCAPES: Readonly<Record<string, string>> = {
  '\\': '\\', '"': '"', "'": "'", n: '\n', t: '\t', r: '\r', '/': '/', b: '\b', f: '\f',
};
const ARITHMETIC: Readonly<Record<string, string>> = {'+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod', '**': 'pow'};
const NOT_THE_LANGUAGE = new Set(['undefined', 'function', 'new', 'await', 'async', 'typeof', 'this', 'let', 'const', 'var']);

const isNameStart = (char: string): boolean => /^[A-Za-z_]$/.test(char);
const isNamePart = (char: string): boolean => /^[A-Za-z0-9_]$/.test(char);
const isDigit = (char: string | undefined): boolean => char !== undefined && char >= '0' && char <= '9';

class Lexer {
  constructor(
    private readonly text: string,
    private readonly base: number,
    readonly locator: Locator,
  ) {}

  fail(code: string, offset: number, fields: Readonly<Record<string, unknown>> = {}): BsxSyntaxError {
    return blokError(this.locator, code, this.base + offset, fields);
  }

  tokens(): Token[] {
    const {text} = this;
    const out: Token[] = [];
    let index = 0;
    while (index < text.length) {
      const char = text[index];
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        index += 1;
        continue;
      }
      if (isNameStart(char)) {
        let end = index + 1;
        while (end < text.length && isNamePart(text[end])) end += 1;
        out.push({kind: 'name', value: text.slice(index, end), offset: this.base + index, literal: null});
        index = end;
        continue;
      }
      if (isDigit(char)) {
        const [end, value] = this.number(index);
        out.push({kind: 'number', value: text.slice(index, end), offset: this.base + index, literal: value});
        index = end;
        continue;
      }
      if (char === '"' || char === "'") {
        const [end, value] = this.string(index);
        out.push({kind: 'string', value: text.slice(index, end), offset: this.base + index, literal: value});
        index = end;
        continue;
      }
      const operator = OPERATORS.find(op => text.startsWith(op, index));
      if (operator === undefined) throw this.fail('expr.syntax', index, {detail: `unexpected '${char}'`});
      if (operator === '`') {
        throw this.fail('expr.syntax', index, {detail: 'template literals are not supported; use text children or str.template'});
      }
      out.push({kind: 'op', value: operator, offset: this.base + index, literal: null});
      index += operator.length;
    }
    out.push({kind: 'end', value: '', offset: this.base + text.length, literal: null});
    return out;
  }

  private number(start: number): [number, number] {
    const {text} = this;
    let index = start;
    while (index < text.length && isDigit(text[index])) index += 1;
    if (text[start] === '0' && index - start > 1) throw this.fail('expr.syntax', start, {detail: 'a number has no leading zeros'});
    if (text[index] === '.' && isDigit(text[index + 1])) {
      index += 1;
      while (index < text.length && isDigit(text[index])) index += 1;
    }
    if (text[index] === 'e' || text[index] === 'E') {
      let exponent = index + 1;
      if (text[exponent] === '+' || text[exponent] === '-') exponent += 1;
      if (isDigit(text[exponent])) {
        index = exponent;
        while (index < text.length && isDigit(text[index])) index += 1;
      }
    }
    if (index < text.length && isNamePart(text[index])) {
      throw this.fail('expr.syntax', start, {detail: `'${text.slice(start, index + 1)}' is not a number`});
    }
    return [index, Number(text.slice(start, index))];
  }

  private string(start: number): [number, string] {
    const {text} = this;
    const quote = text[start];
    let index = start + 1;
    let out = '';
    for (;;) {
      if (index >= text.length) throw this.fail('expr.syntax', start, {detail: 'a string is never closed'});
      const char = text[index];
      if (char === quote) return [index + 1, out];
      if (char === '\n') throw this.fail('expr.syntax', start, {detail: 'a string is never closed on its line'});
      if (char === '\\') {
        const escape = text[index + 1] ?? '';
        if (escape === 'u') {
          const digits = text.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(digits)) throw this.fail('expr.syntax', index, {detail: '\\u takes four hex digits'});
          out += String.fromCharCode(parseInt(digits, 16));
          index += 6;
          continue;
        }
        const replacement = ESCAPES[escape];
        if (replacement === undefined) throw this.fail('expr.syntax', index, {detail: `unknown escape \\${escape}`});
        out += replacement;
        index += 2;
        continue;
      }
      out += char;
      index += 1;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Parser                                                                     */
/* -------------------------------------------------------------------------- */

class Parser {
  private readonly lexer: Lexer;
  private readonly tokens: Token[];
  private index = 0;

  constructor(text: string, base: number, locator: Locator) {
    this.lexer = new Lexer(text, base, locator);
    this.tokens = this.lexer.tokens();
  }

  get token(): Token {
    return this.tokens[this.index];
  }

  peek(ahead = 1): Token {
    return this.tokens[Math.min(this.index + ahead, this.tokens.length - 1)];
  }

  fail(code: string, offset?: number, fields: Readonly<Record<string, unknown>> = {}): BsxSyntaxError {
    return blokError(this.lexer.locator, code, offset ?? this.token.offset, fields);
  }

  advance(): Token {
    const token = this.token;
    this.index += 1;
    return token;
  }

  isOp(...values: string[]): boolean {
    return this.token.kind === 'op' && values.includes(this.token.value);
  }

  expect(value: string): Token {
    if (!this.isOp(value)) throw this.unexpected(`expected '${value}'`);
    return this.advance();
  }

  unexpected(expected: string): BsxSyntaxError {
    const token = this.token;
    if (token.kind === 'end') return this.fail('expr.syntax', undefined, {detail: `${expected}, but the expression ends`});
    if (token.kind === 'op') {
      const refused = this.refused(token);
      if (refused) return refused;
    }
    return this.fail('expr.syntax', undefined, {detail: `${expected}, not '${token.value}'`});
  }

  private refused(token: Token): BsxSyntaxError | null {
    const value = token.value;
    if (value in ARITHMETIC) return this.fail('expr.arithmetic', undefined, {operator: value, function: ARITHMETIC[value]});
    if (value === '=>') return this.fail('expr.lambda');
    if (value === '=') return this.fail('callback.assignment');
    if (value === ';') return this.fail('callback.sequence');
    if (value === '[') return this.fail('expr.subscript');
    if (value === '===' || value === '!==') {
      return this.fail('expr.syntax', undefined, {detail: `write ${value.slice(0, 2)}: equality is always deep`});
    }
    if (value === '?.') return this.fail('expr.syntax', undefined, {detail: '?. is not supported; missing paths read as null'});
    return null;
  }

  isEmpty(): boolean {
    return this.token.kind === 'end';
  }

  callback(): Expr {
    if (this.token.kind === 'name' && this.token.value === 'await') throw this.fail('callback.await');
    const expression = this.expression();
    if (this.token.kind === 'name' && this.token.value === 'into') {
      const into = this.advance();
      if (expression.type !== 'call') throw this.fail('callback.into', into.offset);
      const name = this.token;
      if (name.kind !== 'name' || this.peek().kind !== 'end') throw this.fail('callback.into', into.offset);
      this.advance();
      return {type: 'into', call: expression, name: name.value, offset: into.offset};
    }
    this.finish();
    return expression;
  }

  finish(): void {
    if (this.token.kind !== 'end') throw this.unexpected('expected the end of the expression');
  }

  expression(): Expr {
    return this.ternary();
  }

  private ternary(): Expr {
    const cond = this.logical('??');
    if (!this.isOp('?')) return cond;
    const offset = this.advance().offset;
    const then = this.expression();
    this.expect(':');
    const otherwise = this.expression();
    return {type: 'ternary', cond, then, otherwise, offset};
  }

  private logical(operator: LogicalOperator): Expr {
    const inner = (): Expr => (operator === '??' ? this.logical('||') : operator === '||' ? this.logical('&&') : this.equality());
    const first = inner();
    const operands = [first];
    while (this.isOp(operator)) {
      this.advance();
      operands.push(inner());
    }
    if (operands.length === 1) return first;
    return {type: 'logical', operator, operands, offset: first.offset};
  }

  private equality(): Expr {
    const left = this.relation();
    if (!this.isOp('==', '!=')) return left;
    const operator = this.advance();
    const right = this.relation();
    if (this.isOp('==', '!=', '>', '>=', '<', '<=')) throw this.fail('expr.chained_comparison');
    return {type: 'compare', operator: operator.value, left, right, offset: operator.offset};
  }

  private relation(): Expr {
    const left = this.unary();
    if (!this.isOp('>', '>=', '<', '<=')) return left;
    const operator = this.advance();
    const right = this.unary();
    if (this.isOp('>', '>=', '<', '<=')) throw this.fail('expr.chained_comparison');
    return {type: 'compare', operator: operator.value, left, right, offset: operator.offset};
  }

  private unary(): Expr {
    if (this.isOp('!')) {
      const offset = this.advance().offset;
      return {type: 'not', operand: this.unary(), offset};
    }
    if (this.isOp('-')) {
      const offset = this.advance().offset;
      if (this.token.kind !== 'number') throw this.fail('expr.arithmetic', offset, {operator: '-', function: 'neg'});
      const number = this.advance();
      return {type: 'literal', value: -(number.literal as number), offset};
    }
    return this.postfix(this.primary());
  }

  private postfix(expression: Expr): Expr {
    if (this.isOp('[')) throw this.fail('expr.subscript');
    if (this.isOp('(') && expression.type !== 'call') throw this.fail('expr.syntax', undefined, {detail: 'only a path can be called'});
    if (expression.type === 'call' && this.isOp('.')) {
      throw this.fail('expr.syntax', undefined, {detail: "a call's result has no fields; read them from its record"});
    }
    return expression;
  }

  private primary(): Expr {
    const token = this.token;
    if (token.kind === 'number' || token.kind === 'string') {
      this.advance();
      return {type: 'literal', value: token.literal, offset: token.offset};
    }
    if (token.kind === 'name') {
      if (token.value === 'true' || token.value === 'false') {
        this.advance();
        return {type: 'literal', value: token.value === 'true', offset: token.offset};
      }
      if (token.value === 'null') {
        this.advance();
        return {type: 'literal', value: null, offset: token.offset};
      }
      if (NOT_THE_LANGUAGE.has(token.value)) {
        throw this.fail('expr.syntax', undefined, {detail: `'${token.value}' is not part of the blok language`});
      }
      return this.pathOrCall();
    }
    if (token.kind === 'op') {
      if (token.value === '(') {
        this.advance();
        const inner = this.expression();
        this.expect(')');
        if (this.isOp('=>')) throw this.fail('expr.lambda');
        return inner;
      }
      if (token.value === '[') return this.listLiteral();
      if (token.value === '{') return this.objectLiteral();
    }
    throw this.unexpected('expected a value');
  }

  private pathOrCall(): Expr {
    const first = this.advance();
    const segments = [first.value];
    while (this.isOp('.')) {
      this.advance();
      if (this.token.kind !== 'name') throw this.unexpected("expected a name after '.'");
      segments.push(this.advance().value);
    }
    if (this.isOp('=>')) throw this.fail('expr.lambda');
    if (!this.isOp('(')) return {type: 'path', segments, offset: first.offset};
    this.advance();
    const args: Argument[] = [];
    while (!this.isOp(')')) {
      args.push(this.argument());
      if (!this.isOp(',')) break;
      this.advance();
    }
    this.expect(')');
    return {type: 'call', callee: segments, arguments: args, offset: first.offset};
  }

  private argument(): Argument {
    const token = this.token;
    const next = this.peek();
    if (token.kind === 'name' && next.kind === 'op' && next.value === ':') {
      this.advance();
      this.advance();
      return {name: token.value, value: this.expression(), offset: token.offset};
    }
    if (token.kind === 'name' && next.kind === 'op' && next.value === '=') {
      throw this.fail('expr.syntax', next.offset, {detail: `name an argument with ':' (${token.value}: ...)`});
    }
    return {name: null, value: this.expression(), offset: token.offset};
  }

  private listLiteral(): ListExpr {
    const offset = this.advance().offset;
    const items: Expr[] = [];
    while (!this.isOp(']')) {
      items.push(this.expression());
      if (!this.isOp(',')) break;
      this.advance();
    }
    this.expect(']');
    return {type: 'list', items, offset};
  }

  private objectLiteral(): ObjectExpr {
    const offset = this.advance().offset;
    const entries: Array<[string, Expr]> = [];
    const seen = new Set<string>();
    while (!this.isOp('}')) {
      const key = this.token;
      let name: string;
      if (key.kind === 'name') name = key.value;
      else if (key.kind === 'string' && typeof key.literal === 'string' && key.literal) name = key.literal;
      else throw this.unexpected('expected a key (a name or a non-empty string)');
      this.advance();
      if (seen.has(name)) throw this.fail('expr.duplicate_key', key.offset, {key: name});
      seen.add(name);
      this.expect(':');
      entries.push([name, this.expression()]);
      if (!this.isOp(',')) break;
      this.advance();
    }
    this.expect('}');
    return {type: 'object', entries, offset};
  }
}

const parser = (text: string, base: number, locator: Locator | undefined): Parser => {
  const parsing = new Parser(text, base, locator ?? new Locator(text));
  if (parsing.isEmpty()) throw parsing.fail('expr.syntax', undefined, {detail: 'the expression is empty'});
  return parsing;
};

/** A value expression (no `into`). `base` is where `text` starts in the source `locator` reads. */
export const parseExpression = (text: string, base = 0, locator?: Locator): Expr => {
  const parsing = parser(text, base, locator);
  const expression = parsing.expression();
  parsing.finish();
  return expression;
};

/** An attribute's expression: a value, or a callback (`<call> into <name>`). */
export const parseAttribute = (text: string, base = 0, locator?: Locator): Expr => parser(text, base, locator).callback();

/** The expressions directly inside `expression`. */
export const childrenOf = (expression: Expr): Expr[] => {
  switch (expression.type) {
    case 'list':
      return expression.items;
    case 'object':
      return expression.entries.map(([, value]) => value);
    case 'not':
      return [expression.operand];
    case 'compare':
      return [expression.left, expression.right];
    case 'logical':
      return expression.operands;
    case 'ternary':
      return [expression.cond, expression.then, expression.otherwise];
    case 'call':
      return expression.arguments.map(argument => argument.value);
    case 'into':
      return [expression.call];
    default:
      return [];
  }
};

/** A name a local, let or into may take: `[A-Za-z_][A-Za-z0-9_]*`. */
export const isLocalName = (value: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
