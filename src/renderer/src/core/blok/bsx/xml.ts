import { BsxSyntaxError, type BsxRange } from "./source";

/**
 * The XML half of BSX, read the way Python's `xml.etree.ElementTree` reads
 * it (the reference parser's front end), but keeping where everything is so
 * an editor can point at it: one root element, attributes in single or
 * double quotes, the five named entities and character references,
 * comments and processing instructions skipped, and whitespace in an
 * attribute value folded to spaces (XML's attribute-value normalization).
 */

export type XmlAttribute = {
  name: string;
  value: string;
  nameRange: BsxRange;
  /** Between the quotes. */
  valueRange: BsxRange;
};

export type XmlText = { text: string; range: BsxRange };

export type XmlElement = {
  tag: string;
  tagRange: BsxRange;
  attributes: XmlAttribute[];
  children: XmlElement[];
  /** Text before, between and after the children (whitespace included). */
  texts: XmlText[];
  /** From `<` of the start tag to `>` of the end tag. */
  range: BsxRange;
};

const NAME_START = /[A-Za-z_:À-￿]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-·À-￿]/;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export const parseXml = (source: string): XmlElement => {
  let index = 0;

  const fail = (message: string, start = index, end = start + 1): never => {
    throw new BsxSyntaxError(message, { start, end: Math.min(Math.max(end, start), source.length) });
  };

  const skipWhitespace = () => {
    while (index < source.length && /\s/.test(source[index])) index += 1;
  };

  const readName = (what: string): { name: string; range: BsxRange } => {
    const start = index;
    if (index >= source.length || !NAME_START.test(source[index])) fail(`Expected ${what}`);
    index += 1;
    while (index < source.length && NAME_CHAR.test(source[index])) index += 1;
    return { name: source.slice(start, index), range: { start, end: index } };
  };

  const decode = (raw: string, offset: number, attribute: boolean): string => {
    let out = "";
    for (let at = 0; at < raw.length; at += 1) {
      const char = raw[at];
      if (char === "&") {
        const close = raw.indexOf(";", at);
        if (close < 0) fail("Unterminated entity reference", offset + at);
        const body = raw.slice(at + 1, close);
        if (body.startsWith("#x") || body.startsWith("#X")) {
          const code = Number.parseInt(body.slice(2), 16);
          if (Number.isNaN(code)) fail(`Bad character reference &${body};`, offset + at, offset + close + 1);
          out += String.fromCodePoint(code);
        } else if (body.startsWith("#")) {
          const code = Number.parseInt(body.slice(1), 10);
          if (Number.isNaN(code)) fail(`Bad character reference &${body};`, offset + at, offset + close + 1);
          out += String.fromCodePoint(code);
        } else if (body in ENTITIES) {
          out += ENTITIES[body];
        } else {
          fail(`Undefined entity &${body};`, offset + at, offset + close + 1);
        }
        at = close;
      } else if (char === "<" && attribute) {
        fail("A '<' inside an attribute value must be written &lt;", offset + at);
      } else if (attribute && (char === "\n" || char === "\r" || char === "\t")) {
        // \r\n is one line end, folded to one space.
        if (char === "\r" && raw[at + 1] === "\n") at += 1;
        out += " ";
      } else {
        out += char;
      }
    }
    return out;
  };

  /** Comments, processing instructions and a doctype: nothing BSX reads. */
  const skipMisc = (): boolean => {
    if (source.startsWith("<!--", index)) {
      const close = source.indexOf("-->", index + 4);
      if (close < 0) fail("Unterminated comment", index, index + 4);
      index = close + 3;
      return true;
    }
    if (source.startsWith("<?", index)) {
      const close = source.indexOf("?>", index + 2);
      if (close < 0) fail("Unterminated processing instruction", index, index + 2);
      index = close + 2;
      return true;
    }
    if (source.startsWith("<!", index)) {
      const close = source.indexOf(">", index + 2);
      if (close < 0) fail("Unterminated declaration", index, index + 2);
      index = close + 1;
      return true;
    }
    return false;
  };

  const readElement = (): XmlElement => {
    const start = index;
    index += 1; // <
    const { name: tag, range: tagRange } = readName("a tag name");
    const attributes: XmlAttribute[] = [];

    for (;;) {
      const before = index;
      skipWhitespace();
      if (index >= source.length) fail(`Unclosed start tag <${tag}>`, start, tagRange.end);
      if (source[index] === "/") {
        if (source[index + 1] !== ">") fail("Expected '/>'");
        index += 2;
        return { tag, tagRange, attributes, children: [], texts: [], range: { start, end: index } };
      }
      if (source[index] === ">") {
        index += 1;
        break;
      }
      if (index === before) fail(`Expected whitespace before an attribute of <${tag}>`);
      const { name, range: nameRange } = readName("an attribute name");
      if (attributes.some((attribute) => attribute.name === name)) {
        fail(`Duplicate attribute '${name}' on <${tag}>`, nameRange.start, nameRange.end);
      }
      skipWhitespace();
      if (source[index] !== "=") fail(`Expected '=' after attribute '${name}'`);
      index += 1;
      skipWhitespace();
      const quote = source[index];
      if (quote !== '"' && quote !== "'") fail(`Expected a quoted value for attribute '${name}'`);
      const valueStart = index + 1;
      const close = source.indexOf(quote, valueStart);
      if (close < 0) fail(`Unterminated value of attribute '${name}'`, index, source.length);
      const raw = source.slice(valueStart, close);
      attributes.push({
        name,
        value: decode(raw, valueStart, true),
        nameRange,
        valueRange: { start: valueStart, end: close },
      });
      index = close + 1;
    }

    const children: XmlElement[] = [];
    const texts: XmlText[] = [];
    for (;;) {
      const textStart = index;
      while (index < source.length && source[index] !== "<") index += 1;
      if (index > textStart) {
        texts.push({ text: decode(source.slice(textStart, index), textStart, false), range: { start: textStart, end: index } });
      }
      if (index >= source.length) fail(`<${tag}> is never closed`, start, tagRange.end);
      if (source.startsWith("</", index)) {
        const closeStart = index;
        index += 2;
        const { name, range } = readName("a closing tag name");
        if (name !== tag) fail(`Mismatched tag: </${name}> closes <${tag}>`, range.start, range.end);
        skipWhitespace();
        if (source[index] !== ">") fail(`Expected '>' to close </${name}>`, closeStart, index);
        index += 1;
        return { tag, tagRange, attributes, children, texts, range: { start, end: index } };
      }
      if (skipMisc()) continue;
      children.push(readElement());
    }
  };

  const skipProlog = () => {
    for (;;) {
      skipWhitespace();
      if (!skipMisc()) return;
    }
  };

  skipProlog();
  if (index >= source.length) fail("Unexpected end of input: no element found", Math.max(0, source.length - 1));
  if (source[index] !== "<") fail("Text before the root element");
  const root = readElement();
  skipProlog();
  if (index < source.length) fail("Junk after the root element: BSX holds one root", index, source.length);
  return root;
};
