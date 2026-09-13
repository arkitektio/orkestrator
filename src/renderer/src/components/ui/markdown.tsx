import React, { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  language: string;
  content: string;
}

export function CodeBlock({ language, content }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg border border-border/40 bg-zinc-950 dark:bg-zinc-900/60 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/10 bg-zinc-900 dark:bg-zinc-950/40 text-[10px] font-mono text-zinc-400 select-none">
        <span>{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono text-zinc-100 dark:text-zinc-200 leading-relaxed scrollbar-thin">
        <code>{content}</code>
      </pre>
    </div>
  );
}

interface MarkdownProps {
  text: string;
  isOwn?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Parser. Pure and React-free so the result can be memoised per `text` and
// rendered many times (chat lists rerender at several Hz while tasks stream).
// ---------------------------------------------------------------------------

type InlineNode =
  | string
  | { type: "bold" | "italic"; key: string; children: InlineNode[] }
  | { type: "link"; key: string; url: string; children: InlineNode[] }
  | { type: "code"; key: string; text: string };

type Block =
  | { type: "header"; level: number; inline: InlineNode[] }
  | { type: "blockquote"; inline: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "code"; language: string; content: string }
  | { type: "paragraph"; inline: InlineNode[] };

// Non-global patterns: `exec` is stateless, so hoisting them is safe.
const BOLD_RE = /\*\*([\s\S]+?)\*\*/;
const ITALIC_RE = /\*([\s\S]+?)\*/;
const CODE_RE = /`([\s\S]+?)`/;
const LINK_RE = /\[([\s\S]+?)\]\(([\s\S]+?)\)/;
const HEADER_RE = /^(#{1,6})\s+(.*)$/;
const ULIST_RE = /^[*\-+]\s+(.*)$/;
const OLIST_RE = /^(\d+)\.\s+(.*)$/;

// Earliest match wins; on a tie the order below wins (bold before italic, so
// `**x**` is bold rather than an italic run starting with `*`).
const INLINE_PATTERNS = [
  ["bold", BOLD_RE],
  ["italic", ITALIC_RE],
  ["code", CODE_RE],
  ["link", LINK_RE],
] as const;

const parseInline = (input: string): InlineNode[] => {
  const nodes: InlineNode[] = [];
  let rest = input;
  let offset = 0;

  while (rest) {
    let match: RegExpExecArray | null = null;
    let type: (typeof INLINE_PATTERNS)[number][0] | null = null;
    let index = Infinity;

    for (const [candidateType, re] of INLINE_PATTERNS) {
      const m = re.exec(rest);
      if (m && m.index < index) {
        match = m;
        type = candidateType;
        index = m.index;
      }
    }

    if (!match || !type) {
      nodes.push(rest);
      break;
    }

    if (index > 0) {
      nodes.push(rest.substring(0, index));
    }

    const key = `${type}-${offset + index}`;
    const inside = match[1];
    if (type === "code") {
      nodes.push({ type, key, text: inside });
    } else if (type === "link") {
      nodes.push({ type, key, url: match[2], children: parseInline(inside) });
    } else {
      nodes.push({ type, key, children: parseInline(inside) });
    }

    const consumed = index + match[0].length;
    rest = rest.substring(consumed);
    offset += consumed;
  }

  return nodes;
};

const parseBlocks = (markdownText: string): Block[] => {
  const lines = markdownText.split("\n");
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeLanguage = "";
  let codeContent: string[] = [];

  let currentList: { ordered: boolean; items: InlineNode[][] } | null = null;
  let currentParagraphLines: string[] = [];

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: "list",
        ordered: currentList.ordered,
        items: currentList.items,
      });
      currentList = null;
    }
  };

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        inline: parseInline(currentParagraphLines.join("\n")),
      });
      currentParagraphLines = [];
    }
  };

  const flushAll = () => {
    flushList();
    flushParagraph();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inCodeBlock) {
      if (line.trim().startsWith("```")) {
        blocks.push({
          type: "code",
          language: codeLanguage,
          content: codeContent.join("\n"),
        });
        inCodeBlock = false;
        codeLanguage = "";
        codeContent = [];
      } else {
        codeContent.push(line);
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      flushAll();
      inCodeBlock = true;
      codeLanguage = line.trim().slice(3).trim();
      continue;
    }

    const headerMatch = HEADER_RE.exec(line);
    if (headerMatch) {
      flushAll();
      blocks.push({
        type: "header",
        level: headerMatch[1].length,
        inline: parseInline(headerMatch[2]),
      });
      continue;
    }

    if (line.startsWith("> ")) {
      flushAll();
      blocks.push({ type: "blockquote", inline: parseInline(line.slice(2)) });
      continue;
    }

    const uListMatch = ULIST_RE.exec(line);
    if (uListMatch) {
      flushParagraph();
      const item = parseInline(uListMatch[1]);
      if (currentList && !currentList.ordered) {
        currentList.items.push(item);
      } else {
        flushList();
        currentList = { ordered: false, items: [item] };
      }
      continue;
    }

    const oListMatch = OLIST_RE.exec(line);
    if (oListMatch) {
      flushParagraph();
      const item = parseInline(oListMatch[2]);
      if (currentList && currentList.ordered) {
        currentList.items.push(item);
      } else {
        flushList();
        currentList = { ordered: true, items: [item] };
      }
      continue;
    }

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    flushList();
    currentParagraphLines.push(line);
  }

  flushAll();
  if (inCodeBlock) {
    blocks.push({
      type: "code",
      language: codeLanguage,
      content: codeContent.join("\n"),
    });
  }

  return blocks;
};

// ---------------------------------------------------------------------------
// Renderer. Only the `isOwn`-dependent classes live here.
// ---------------------------------------------------------------------------

const renderInline = (nodes: InlineNode[], isOwn: boolean): React.ReactNode[] =>
  nodes.map((node) => {
    if (typeof node === "string") return node;
    switch (node.type) {
      case "bold":
        return (
          <strong key={node.key} className="font-semibold">
            {renderInline(node.children, isOwn)}
          </strong>
        );
      case "italic":
        return (
          <em key={node.key} className="italic">
            {renderInline(node.children, isOwn)}
          </em>
        );
      case "code":
        return (
          <code
            key={node.key}
            className={cn(
              "font-mono text-xs px-1 py-0.5 rounded border select-all",
              isOwn
                ? "bg-primary-foreground/15 border-primary-foreground/10 text-primary-foreground"
                : "bg-muted border-border/40 text-foreground"
            )}
          >
            {node.text}
          </code>
        );
      case "link":
        return (
          <a
            key={node.key}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline font-medium transition-opacity hover:opacity-80 inline-flex items-center gap-0.5",
              isOwn ? "text-primary-foreground" : "text-primary"
            )}
          >
            {renderInline(node.children, isOwn)}
          </a>
        );
    }
  });

function MarkdownImpl({ text, isOwn = false, className }: MarkdownProps) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <div className={cn("space-y-2 text-sm leading-relaxed", className)}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "header": {
            const H = `h${Math.min(block.level, 6)}` as React.ElementType<
              React.HTMLAttributes<HTMLHeadingElement>
            >;
            const sizeClass =
              block.level === 1
                ? "text-lg font-bold mt-3 mb-1 text-foreground"
                : block.level === 2
                  ? "text-base font-semibold mt-2.5 mb-1 text-foreground"
                  : "text-sm font-semibold mt-2 mb-0.5 text-foreground";
            return (
              <H key={idx} className={sizeClass}>
                {renderInline(block.inline, isOwn)}
              </H>
            );
          }
          case "blockquote":
            return (
              <blockquote
                key={idx}
                className={cn(
                  "border-l-2 pl-3 py-0.5 my-1 italic text-xs",
                  isOwn
                    ? "border-primary-foreground/35 text-primary-foreground/80"
                    : "border-primary/40 text-muted-foreground bg-muted/20 rounded-r"
                )}
              >
                {renderInline(block.inline, isOwn)}
              </blockquote>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={idx}
                className={cn(
                  "pl-5 my-1.5 space-y-1",
                  block.ordered ? "list-decimal" : "list-disc"
                )}
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-inherit">
                    {renderInline(item, isOwn)}
                  </li>
                ))}
              </Tag>
            );
          }
          case "code":
            return (
              <CodeBlock
                key={idx}
                language={block.language}
                content={block.content}
              />
            );
          case "paragraph":
          default:
            return (
              <p key={idx} className="whitespace-pre-wrap leading-relaxed break-words">
                {renderInline(block.inline, isOwn)}
              </p>
            );
        }
      })}
    </div>
  );
}

export const Markdown = React.memo(MarkdownImpl);
