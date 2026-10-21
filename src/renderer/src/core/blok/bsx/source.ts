/** A span of the source, as offsets: `start` inclusive, `end` exclusive. */
export type BsxRange = { start: number; end: number };

/** Why BSX does not parse, and where. */
export class BsxSyntaxError extends Error {
  constructor(
    message: string,
    readonly range: BsxRange,
  ) {
    super(message);
    this.name = "BsxSyntaxError";
  }
}

/** 1-based line and column of an offset, the way an editor counts them. */
export const positionAt = (text: string, offset: number): { line: number; column: number } => {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, text.length);
  for (let index = 0; index < end; index += 1) {
    if (text.charCodeAt(index) === 10) {
      line += 1;
      lineStart = index + 1;
    }
  }
  return { line, column: end - lineStart + 1 };
};

/** The offset of a 1-based line and column, clamped to the text. */
export const offsetAt = (text: string, line: number, column: number): number => {
  let current = 1;
  let index = 0;
  while (current < line && index < text.length) {
    if (text.charCodeAt(index) === 10) current += 1;
    index += 1;
  }
  return Math.min(text.length, index + Math.max(0, column - 1));
};
