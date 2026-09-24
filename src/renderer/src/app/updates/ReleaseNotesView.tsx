import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import React, { useMemo } from "react";
import { looksLikeHtml, type ReleaseNote } from "./releaseNotes";

/**
 * Release notes, rendered as the app's own typography instead of a raw string.
 *
 * GitHub sends the release body already rendered to HTML, and that HTML comes
 * from the network, so it is never injected: it is parsed with `DOMParser`
 * (inert — nothing runs, nothing loads) and walked into a small allowlisted
 * tree, and only that tree becomes React elements. Anything outside the
 * allowlist is unwrapped to its text, or dropped with its content when it is
 * never text (script, style, iframe…). Links keep only http(s) targets and open
 * in the system browser.
 *
 * The notes are semantic-release's: a `# [2.14.0](compare) (date)` heading that
 * repeats what the card already says, `### Features` / `### Bug Fixes`
 * sections, and a `(abc1234)` commit link on every line. The heading is lifted
 * out for its date, sections become small labels, and commit links become quiet
 * hash chips without their parentheses.
 */

type Tag =
  | "p"
  | "ul"
  | "ol"
  | "li"
  | "strong"
  | "em"
  | "code"
  | "pre"
  | "a"
  | "h"
  | "blockquote"
  | "br"
  | "hr";

export type NoteNode =
  | { t: "text"; text: string }
  | { t: "el"; tag: Tag; href?: string; hash?: boolean; children: NoteNode[] };

export type ParsedNote = { date?: string; nodes: NoteNode[] };

const TAGS: Record<string, Tag> = {
  p: "p",
  ul: "ul",
  ol: "ol",
  li: "li",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  code: "code",
  tt: "code",
  pre: "pre",
  a: "a",
  h1: "h",
  h2: "h",
  h3: "h",
  h4: "h",
  h5: "h",
  h6: "h",
  blockquote: "blockquote",
  br: "br",
  hr: "hr",
};

/** Never text: dropped with everything inside. */
const DROP = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "template",
  "noscript",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "img",
  "video",
  "audio",
  "link",
  "meta",
]);

const HASH_RE = /^[0-9a-f]{7,40}$/i;

/** `2.14.0 (2026-09-24)` / `v2.14.0-rc.1 (2026-09-24)` — the release heading. */
const VERSION_HEADING_RE = /^\s*v?\d+\.\d+\.\d+\S*\s*(?:\((\d{4}-\d{2}-\d{2})\))?\s*$/;

const safeHref = (href: string | null): string | undefined => {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const textOf = (nodes: NoteNode[]): string =>
  nodes.map((n) => (n.t === "text" ? n.text : textOf(n.children))).join("");

const walk = (node: Node): NoteNode[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text ? [{ t: "text", text }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as Element;
  const name = el.tagName.toLowerCase();
  if (DROP.has(name)) return [];

  const children = tidyCommitLinks(Array.from(el.childNodes).flatMap(walk));
  const tag = TAGS[name];
  if (!tag) return children;

  if (tag === "a") {
    const href = safeHref(el.getAttribute("href"));
    if (!href) return children;
    return [{ t: "el", tag, href, hash: HASH_RE.test(textOf(children).trim()), children }];
  }
  return [{ t: "el", tag, children }];
};

/** `text (<a>abc1234</a>)` → `text <a>abc1234</a>`: the chip is its own bracket. */
const tidyCommitLinks = (nodes: NoteNode[]): NoteNode[] => {
  const out = nodes.map((n) => ({ ...n }));
  out.forEach((node, i) => {
    if (node.t !== "el" || !node.hash) return;
    const prev = out[i - 1];
    const next = out[i + 1];
    if (prev?.t === "text" && /\(\s*$/.test(prev.text)) {
      prev.text = prev.text.replace(/\s*\(\s*$/, " ");
      if (next?.t === "text" && /^\s*\)/.test(next.text)) {
        next.text = next.text.replace(/^\s*\)/, "");
      }
    }
  });
  return out.filter((n) => n.t !== "text" || n.text !== "");
};

/** Whitespace-only text between blocks is formatting, not content. */
const trimBlockText = (nodes: NoteNode[]) =>
  nodes.filter((n) => n.t !== "text" || n.text.trim() !== "");

export const parseReleaseHtml = (html: string): ParsedNote => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = trimBlockText(tidyCommitLinks(Array.from(doc.body.childNodes).flatMap(walk)));

  // The leading `2.14.0 (date)` heading: keep the date, drop the rest.
  const first = nodes[0];
  if (first?.t === "el" && first.tag === "h") {
    const match = VERSION_HEADING_RE.exec(textOf(first.children));
    if (match) return { date: match[1], nodes: nodes.slice(1) };
  }
  return { nodes };
};

const MD_VERSION_HEADING_RE =
  /^\s*#{1,2}\s+\[?v?\d+\.\d+\.\d+[^\]\s]*\]?(?:\([^)]*\))?\s*(?:\((\d{4}-\d{2}-\d{2})\))?\s*\n/;

/** The Markdown twin of the heading lift above. */
export const splitMarkdownHeading = (md: string): { date?: string; body: string } => {
  const match = MD_VERSION_HEADING_RE.exec(md);
  return match ? { date: match[1], body: md.slice(match[0].length) } : { body: md };
};

const openLink = (href: string) => (event: React.MouseEvent) => {
  event.preventDefault();
  if (window.api?.openWebbrowser) void window.api.openWebbrowser(href);
  else window.open(href, "_blank", "noopener");
};

const renderNodes = (nodes: NoteNode[], path: string): React.ReactNode[] =>
  nodes.map((node, i) => {
    const key = `${path}.${i}`;
    if (node.t === "text") return node.text;
    const kids = renderNodes(node.children, key);

    switch (node.tag) {
      case "h": {
        const label = textOf(node.children).trim();
        return (
          <div
            key={key}
            className={cn(
              "mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider first:mt-0",
              /breaking/i.test(label) ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {kids}
          </div>
        );
      }
      case "p":
        return (
          <p key={key} className="my-1.5 leading-relaxed">
            {kids}
          </p>
        );
      case "ul":
        return (
          <ul key={key} className="my-1 space-y-1 pl-4 [list-style:disc] marker:text-muted-foreground/60">
            {kids}
          </ul>
        );
      case "ol":
        return (
          <ol key={key} className="my-1 list-decimal space-y-1 pl-4 marker:text-muted-foreground/60">
            {kids}
          </ol>
        );
      case "li":
        return (
          <li key={key} className="leading-snug">
            {kids}
          </li>
        );
      case "strong":
        return (
          <strong key={key} className="font-medium text-foreground">
            {kids}
          </strong>
        );
      case "em":
        return <em key={key}>{kids}</em>;
      case "code":
        return (
          <code key={key} className="rounded bg-muted px-1 py-px font-mono text-[0.9em]">
            {kids}
          </code>
        );
      case "pre":
        return (
          <pre key={key} className="my-2 overflow-x-auto rounded bg-muted p-2 font-mono text-[11px]">
            {textOf(node.children)}
          </pre>
        );
      case "blockquote":
        return (
          <blockquote key={key} className="my-2 border-l-2 pl-3 text-muted-foreground">
            {kids}
          </blockquote>
        );
      case "br":
        return <br key={key} />;
      case "hr":
        return <hr key={key} className="my-3 border-border" />;
      case "a":
        return node.hash ? (
          <a
            key={key}
            href={node.href}
            onClick={openLink(node.href!)}
            title={node.href}
            className="ml-1 whitespace-nowrap rounded px-1 font-mono text-[10px] text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          >
            {textOf(node.children).trim()}
          </a>
        ) : (
          <a
            key={key}
            href={node.href}
            onClick={openLink(node.href!)}
            className="text-primary underline-offset-2 hover:underline"
          >
            {kids}
          </a>
        );
    }
  });

const NoteBody = ({ note, showVersion }: { note: ReleaseNote; showVersion: boolean }) => {
  const parsed = useMemo(() => {
    if (looksLikeHtml(note.body)) {
      const { date, nodes } = parseReleaseHtml(note.body);
      return { date, content: renderNodes(nodes, "n") };
    }
    const { date, body } = splitMarkdownHeading(note.body);
    return { date, content: <Markdown text={body} /> };
  }, [note.body]);

  return (
    <section>
      {(showVersion || parsed.date) && (
        <div className="mb-1.5 flex items-baseline gap-2">
          {showVersion && note.version && (
            <span className="text-sm font-semibold">{note.version}</span>
          )}
          {parsed.date && (
            <span className="text-xs text-muted-foreground">{parsed.date}</span>
          )}
        </div>
      )}
      <div className="text-xs text-foreground/90">{parsed.content}</div>
    </section>
  );
};

export const ReleaseNotes = ({
  notes,
  className,
}: {
  notes: ReleaseNote[];
  className?: string;
}) => (
  <div className={cn("space-y-4", className)}>
    {notes.map((note, i) => (
      <NoteBody
        key={note.version ?? i}
        note={note}
        // One note is the update the card already names; several are a
        // changelog and each needs its version.
        showVersion={notes.length > 1}
      />
    ))}
  </div>
);
