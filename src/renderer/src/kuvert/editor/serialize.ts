/**
 * The mail editor's document (a Plate value) as what a mail carries: an HTML
 * part and a plain-text part. A tree walk rather than Plate's static renderer,
 * so the output is small, deterministic and testable without React.
 *
 * One block is one line, as mail clients write it: a paragraph is a `<div>`
 * (an empty one a `<div><br></div>`), and the text part puts one newline
 * between blocks. Lists are Plate's flat indent lists (`listStyleType` +
 * `indent` on the block), nested back into `<ul>`/`<ol>` here.
 */

/** The parts of a Plate node the serializer reads; everything else is ignored. */
export type MailNode = {
  type?: string;
  text?: string;
  children?: readonly MailNode[];
  url?: string;
  listStyleType?: string;
  indent?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

const BULLETS = new Set(["disc", "circle", "square", "todo"]);
const SAFE_URL = /^(https?:|mailto:)/i;

/** Gmail's quote style, so a quote looks like one in every client. */
const QUOTE_STYLE = "margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex";

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Only links a reader can follow safely keep their href. */
export const safeUrl = (url: string | undefined) => (url && SAFE_URL.test(url.trim()) ? url.trim() : undefined);

const plain = (node: MailNode): string =>
  node.text !== undefined ? node.text : (node.children ?? []).map(plain).join("");

const isList = (node: MailNode) => !!node.listStyleType;
const listTag = (node: MailNode) => (BULLETS.has(node.listStyleType!) ? "ul" : "ol");

// --- HTML -----------------------------------------------------------------

const leafHtml = (node: MailNode) => {
  let html = escapeHtml(node.text ?? "").replace(/\n/g, "<br>");
  if (node.code) html = `<code>${html}</code>`;
  if (node.bold) html = `<strong>${html}</strong>`;
  if (node.italic) html = `<em>${html}</em>`;
  if (node.underline) html = `<u>${html}</u>`;
  if (node.strikethrough) html = `<s>${html}</s>`;
  return html;
};

const inlineHtml = (nodes: readonly MailNode[] = []): string =>
  nodes
    .map((node) => {
      if (node.text !== undefined) return leafHtml(node);
      const inner = inlineHtml(node.children);
      const href = node.type === "a" ? safeUrl(node.url) : undefined;
      return href ? `<a href="${escapeHtml(href)}">${inner}</a>` : inner;
    })
    .join("");

const blockHtml = (node: MailNode) => {
  const inner = inlineHtml(node.children);
  switch (node.type) {
    case "h1":
    case "h2":
    case "h3":
      return `<${node.type}>${inner}</${node.type}>`;
    case "blockquote":
      return `<blockquote style="${QUOTE_STYLE}">${inner || "<br>"}</blockquote>`;
    default:
      return `<div>${inner || "<br>"}</div>`;
  }
};

/** The document as an HTML fragment. */
export const toHtml = (value: readonly MailNode[]) => {
  let out = "";
  // Open lists, outermost first; each has an `<li>` still open for nesting.
  const open: { tag: string; indent: number }[] = [];
  const close = (until: (top: { tag: string; indent: number }) => boolean) => {
    while (open.length && !until(open[open.length - 1])) out += `</li></${open.pop()!.tag}>`;
  };

  for (const node of value) {
    if (!isList(node)) {
      close(() => false);
      out += blockHtml(node);
      continue;
    }
    const indent = Math.max(1, node.indent ?? 1);
    const tag = listTag(node);
    close((top) => top.indent < indent || (top.indent === indent && top.tag === tag));
    const content = inlineHtml(node.children) || "<br>";
    if (open.length && open[open.length - 1].indent === indent) {
      out += `</li><li>${content}`;
    } else {
      out += `<${tag}><li>${content}`;
      open.push({ tag, indent });
    }
  }
  close(() => false);
  return out;
};

/** The document as the HTML part of a mail. */
export const toMailHtml = (value: readonly MailNode[]) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${toHtml(value)}</body></html>`;

// --- Text -----------------------------------------------------------------

const inlineText = (nodes: readonly MailNode[] = []): string =>
  nodes
    .map((node) => {
      if (node.text !== undefined) return node.text;
      const inner = inlineText(node.children);
      const href = node.type === "a" ? safeUrl(node.url) : undefined;
      return href && href !== inner && `mailto:${inner}` !== href ? `${inner} <${href}>` : inner;
    })
    .join("");

/** The document as the plain-text part: bullets as "- " / "1. ", quotes as "> ". */
export const toText = (value: readonly MailNode[]) => {
  const lines: string[] = [];
  // The next number per indent level of the ordered list being written.
  let counters: number[] = [];

  for (const node of value) {
    const text = inlineText(node.children);
    if (!isList(node)) {
      counters = [];
      lines.push(node.type === "blockquote" ? text.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n") : text);
      continue;
    }
    const indent = Math.max(1, node.indent ?? 1);
    counters = counters.slice(0, indent);
    const n = (counters[indent - 1] ?? 0) + 1;
    counters[indent - 1] = n;
    const marker = listTag(node) === "ul" ? "-" : `${n}.`;
    lines.push(`${"   ".repeat(indent - 1)}${marker} ${text}`);
  }
  return lines.join("\n");
};

/** Nothing typed yet (a list bullet or empty quote alone does not count). */
export const isEmpty = (value: readonly MailNode[]) => value.every((node) => plain(node).trim() === "");

/**
 * Plain text as a document: one paragraph per line, and each run of lines
 * starting with ">" as one quote (one level of ">" taken off). Seeds the
 * editor from a text body and from the quoted original of a reply.
 */
export const fromText = (text: string): MailNode[] => {
  const nodes: MailNode[] = [];
  let quote: string[] | null = null;
  const flush = () => {
    if (quote) nodes.push({ type: "blockquote", children: [{ text: quote.join("\n") }] });
    quote = null;
  };
  for (const line of text.split("\n")) {
    if (line.startsWith(">")) {
      (quote ??= []).push(line.replace(/^> ?/, ""));
      continue;
    }
    flush();
    nodes.push({ type: "p", children: [{ text: line }] });
  }
  flush();
  return nodes.length ? nodes : [{ type: "p", children: [{ text: "" }] }];
};
