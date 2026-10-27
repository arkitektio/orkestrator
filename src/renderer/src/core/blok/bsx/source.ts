import {diagnosticMessage} from '../spec/vocabulary';

/** A span of the source, as UTF-16 offsets (what an editor marks): `start` inclusive, `end` exclusive. */
export type BsxRange = {start: number; end: number};

export type BsxSyntaxErrorInit = {
  /** The vocabulary's diagnostic code (`bsx.unclosed`, `expr.arithmetic`, `callback.sequence`, ...). */
  code: string;
  fields?: Readonly<Record<string, unknown>>;
  /** 1-based line. */
  line: number;
  /** 1-based column, in Unicode code points (the corpus' and the server's count). */
  column: number;
  range: BsxRange;
};

/** Why BSX does not parse, and where: the first problem, with its stable code. */
export class BsxSyntaxError extends Error {
  readonly code: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly line: number;
  readonly column: number;
  readonly range: BsxRange;

  constructor(init: BsxSyntaxErrorInit) {
    super(diagnosticMessage(init.code, init.fields ?? {}));
    this.name = 'BsxSyntaxError';
    this.code = init.code;
    this.fields = init.fields ?? {};
    this.line = init.line;
    this.column = init.column;
    this.range = init.range;
  }
}

/** 1-based line and column of an offset, the way an editor counts them (UTF-16 units). */
export const positionAt = (text: string, offset: number): {line: number; column: number} => {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, text.length);
  for (let index = 0; index < end; index += 1) {
    if (text.charCodeAt(index) === 10) {
      line += 1;
      lineStart = index + 1;
    }
  }
  return {line, column: end - lineStart + 1};
};

/** The offset of a 1-based line and (UTF-16) column, clamped to the text. */
export const offsetAt = (text: string, line: number, column: number): number => {
  let current = 1;
  let index = 0;
  while (current < line && index < text.length) {
    if (text.charCodeAt(index) === 10) current += 1;
    index += 1;
  }
  return Math.min(text.length, index + Math.max(0, column - 1));
};

/** The offset of a 1-based line and code-point column (how the server and the corpus count), clamped. */
export const offsetAtCodePoint = (text: string, line: number, column: number): number => {
  const lineStart = offsetAt(text, line, 1);
  let index = lineStart;
  for (let counted = 1; counted < column && index < text.length && text.charCodeAt(index) !== 10; counted += 1) {
    const code = text.codePointAt(index) ?? 0;
    index += code > 0xffff ? 2 : 1;
  }
  return index;
};
