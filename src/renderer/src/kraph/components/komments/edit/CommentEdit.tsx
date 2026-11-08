import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import type { StructureOption } from "@/core/modules/host/options";
import { reportErrorAs } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { DescendantInput, DescendantKind } from "@/kraph/api/graphql";
import { BoldPlugin, CodePlugin, UnderlinePlugin } from "@platejs/basic-nodes/react";
import { MentionPlugin } from "@platejs/mention/react";
import { KEYS, type TMentionElement, type TRange, type TText } from "platejs";
import {
  Bold,
  Code,
  Italic,
  Send,
  Underline,
} from "lucide-react";
import {
  Plate,
  PlateContent,
  PlateElement,
  type PlateEditor,
  type PlateElementProps,
  usePlateEditor,
} from "platejs/react";
import { useEffect, useRef, useState } from "react";
import { CommentOnStructureFunc } from "../types";

export type CommentEditProps = {
  identifier: string;
  object: string;
  parent?: string;
  commentOnStructure: CommentOnStructureFunc;
};

// Convert Plate editor content to DescendantInput
const convertToDescendantInput = (nodes: any[]): DescendantInput[] => {
  return nodes.flatMap((node): DescendantInput[] => {
    // Handle text nodes
    if (node.text !== undefined) {
      return [
        {
          kind: DescendantKind.Leaf,
          text: node.text,
          bold: node.bold || undefined,
          italic: node.italic || undefined,
          code: node.code || undefined,
        },
      ];
    }

    // Handle mention nodes: `key` is the mentioned user's id, `value` the name
    // shown. The input field stays `user` even though the read side calls it
    // `subject` — kraph keeps the write shape compatible with lok's tree, so
    // only the render path renames.
    if (node.type === KEYS.mention) {
      if (!node.key) return [];
      return [
        {
          kind: DescendantKind.Mention,
          user: String(node.key),
          text: node.value || '',
          children: [],
        },
      ];
    }

    // Handle paragraph nodes
    if (node.type === 'p' || !node.type) {
      return [
        {
          kind: DescendantKind.Paragraph,
          children: node.children ? convertToDescendantInput(node.children) : [],
        },
      ];
    }

    // Recursively process children for other nodes
    if (node.children) {
      return convertToDescendantInput(node.children);
    }

    return [];
  });
};

/** A mention in the editor: `@name`, one inline unit the caret steps over. */
const MentionChip = (props: PlateElementProps<TMentionElement>) => (
  <PlateElement
    {...props}
    as="span"
    className="mx-0.5 inline-block rounded bg-secondary px-1 align-baseline font-medium text-secondary-foreground"
    attributes={{ ...props.attributes, contentEditable: false, draggable: true }}
  >
    {props.children}@{props.element.value}
  </PlateElement>
);

/** An `@query` the caret sits at the end of, in the text it was typed in. */
type MentionQuery = { range: TRange; search: string };

/** The `@query` right before a collapsed caret, if any: `@` at the start or after a space. */
const mentionQueryAt = (editor: PlateEditor): MentionQuery | null => {
  const selection = editor.selection;
  if (!selection || !editor.api.isCollapsed()) return null;
  const { path, offset } = selection.anchor;
  const entry = editor.api.node<TText>(path);
  if (!entry || typeof entry[0].text !== "string") return null;
  const match = /(?:^|\s)@([^\s@]{0,30})$/.exec(entry[0].text.slice(0, offset));
  if (!match) return null;
  const search = match[1];
  return { range: { anchor: { path, offset: offset - search.length - 1 }, focus: { path, offset } }, search };
};

export const CommentEdit = ({
  commentOnStructure,
  object,
  parent,
  identifier,
}: CommentEditProps) => {
  const [saving, setSaving] = useState(false);

  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      UnderlinePlugin,
      CodePlugin,
      // The plugin's own `@` trigger inserts a combobox input element that
      // needs Plate's combobox UI; the picker below reads the typed `@query`
      // from the text instead, so the trigger stays off.
      MentionPlugin.configure({ options: { triggerQuery: () => false } }).withComponent(MentionChip),
    ],
    value: [
      {
        type: 'p',
        children: [{ text: '' }],
      },
    ],
  });


  // Mentions pick from the members lok knows (the host's `@lok/user` option
  // source); without lok, `@` is just text.
  const searchUsers = useStructureOptions("@lok/user");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [options, setOptions] = useState<StructureOption[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  const search = query?.search;
  useEffect(() => {
    if (search === undefined || !searchUsers) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    searchUsers({ search })
      .then((found) => {
        if (cancelled) return;
        setOptions(found.slice(0, 8));
        setHighlight(0);
      })
      .catch((error) => console.warn("mention search failed", error));
    return () => {
      cancelled = true;
    };
  }, [search, searchUsers]);

  const trackMention = () => {
    const next = searchUsers ? mentionQueryAt(editor) : null;
    setQuery(next);
    if (!next || !wrapperRef.current) return setAnchor(null);
    const caret = editor.api.toDOMRange(next.range)?.getBoundingClientRect();
    const box = wrapperRef.current.getBoundingClientRect();
    setAnchor(caret ? { top: caret.bottom - box.top + 4, left: Math.max(0, caret.left - box.left) } : null);
  };

  const pickMention = (option: StructureOption) => {
    if (!query) return;
    editor.tf.select(query.range);
    editor.tf.delete();
    editor.tf.insertNodes(
      { type: KEYS.mention, key: option.value, value: option.label, children: [{ text: "" }] },
      { select: true },
    );
    editor.tf.move({ unit: "offset" });
    editor.tf.insertText(" ");
    editor.tf.focus();
    setQuery(null);
  };

  const pickerOpen = !!query && options.length > 0;

  const saveComment = () => {
    const editorContent = editor.children;
    setSaving(true);
    commentOnStructure({
      variables: {
        identifier: identifier,
        object: object,
        parent: parent,
        descendants: convertToDescendantInput(editorContent),
      },
    })
      // A failed comment keeps its text, so it can be sent again.
      .then(() => editor.tf.reset())
      .catch(reportErrorAs("Couldn't post the comment"))
      .finally(() => setSaving(false));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (pickerOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setHighlight((at) => (at + step + options.length) % options.length);
        return;
      }
      if ((event.key === "Enter" || event.key === "Tab") && !event.ctrlKey) {
        event.preventDefault();
        pickMention(options[Math.min(highlight, options.length - 1)]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setQuery(null);
        return;
      }
    }
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      saveComment();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 min-h-32 ">
      <Plate editor={editor} onSelectionChange={trackMention} onValueChange={trackMention}>
        <div ref={wrapperRef} className="relative rounded-lg border bg-background/20 h-full">
          <div className="flex items-center gap-1 border-b px-3 py-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => editor.tf.toggleMark('bold')}
              className=" p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => editor.tf.toggleMark('italic')}
              className=" p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => editor.tf.toggleMark('underline')}
              className="p-0"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => editor.tf.toggleMark('code')}
              className="p-0"
            >
              <Code className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={saveComment}
              disabled={saving}
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
          <PlateContent
            className="h-full px-3 py-2 text-sm focus-visible:outline-none"
            placeholder="Write a comment."
            onKeyDown={handleKeyDown}
            onBlur={() => setQuery(null)}
          />
          {pickerOpen && anchor && (
            <div
              role="listbox"
              aria-label="Mention someone"
              className="absolute z-50 min-w-40 max-w-64 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md"
              style={{ top: anchor.top, left: anchor.left }}
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={index === highlight}
                  className={cn(
                    "cursor-pointer truncate rounded-sm px-2 py-1",
                    index === highlight && "bg-accent text-accent-foreground",
                  )}
                  // mousedown, not click: the editor keeps focus and its selection.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pickMention(option);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                >
                  @{option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </Plate>
    </div>
  );
};
