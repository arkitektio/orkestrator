import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Separator } from "@/core/ui/separator";
import { Toggle } from "@/core/ui/toggle";
import { cn } from "@/core/util/utils";
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H3Plugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { IndentPlugin } from "@platejs/indent/react";
import { unwrapLink, upsertLink } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import { indentList, isOrderedList, outdentList, someList, toggleList } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import {
  Bold,
  Code,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { KEYS, type TElement, type Value } from "platejs";
import {
  Plate,
  PlateContent,
  PlateElement,
  type PlateEditor,
  type PlateElementProps,
  type RenderNodeWrapper,
  useEditorRef,
  useEditorSelector,
  usePlateEditor,
} from "platejs/react";
import React, { useState } from "react";
import { fromText, isEmpty, type MailNode } from "../../editor/serialize";

/** A flat indent-list block drawn inside its `<ul>`/`<ol>`, as Plate's list kit does. */
const ListItem = (props: PlateElementProps) => {
  const element = props.element as TElement & { listStyleType?: string; listStart?: number };
  const Tag = isOrderedList(element) ? "ol" : "ul";
  return (
    <Tag className="relative m-0 p-0" style={{ listStyleType: element.listStyleType }} start={element.listStart}>
      <li>{props.children}</li>
    </Tag>
  );
};

const BlockList: RenderNodeWrapper = (props) => {
  if (!props.element.listStyleType) return;
  return (inner) => <ListItem {...inner} />;
};

/** No href while editing: a click in the editor places the caret, never navigates. */
const LinkElement = (props: PlateElementProps) => (
  <PlateElement
    {...props}
    as="a"
    className="text-primary underline underline-offset-2"
    attributes={{ ...props.attributes, title: (props.element as TElement & { url?: string }).url }}
  >
    {props.children}
  </PlateElement>
);

const BLOCKS = [KEYS.p, KEYS.h3, KEYS.blockquote];

const PLUGINS = [
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  H3Plugin,
  BlockquotePlugin,
  IndentPlugin.configure({ inject: { targetPlugins: BLOCKS } }),
  ListPlugin.configure({ inject: { targetPlugins: BLOCKS }, render: { belowNodes: BlockList } }),
  LinkPlugin.withComponent(LinkElement),
];

/** An editor for a mail body, starting from `initial` (a document or plain text). */
export const useMailEditor = (initial?: MailNode[] | string, autoSelect?: "start" | "end") =>
  usePlateEditor({
    plugins: PLUGINS,
    autoSelect,
    value: (typeof initial === "string" || !initial ? fromText(initial ?? "") : initial) as Value,
  });

/** Holds the editor for the toolbar and content below it; `onEmptyChange` follows whether anything is typed. */
export const MailEditor = ({
  editor,
  onEmptyChange,
  children,
}: {
  editor: PlateEditor;
  onEmptyChange?: (empty: boolean) => void;
  children: React.ReactNode;
}) => (
  <Plate editor={editor} onValueChange={({ value }) => onEmptyChange?.(isEmpty(value as MailNode[]))}>
    {children}
  </Plate>
);

/** The writing surface: borderless, so the surrounding card draws the frame. */
export const MailContent = ({
  placeholder,
  className,
  autoFocus,
}: {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) => {
  const editor = useEditorRef();
  return (
    <PlateContent
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={cn(
        "p-4 text-sm leading-relaxed outline-none",
        "[&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]",
        className,
      )}
      onKeyDown={(e) => {
        // Tab nests a list item, Shift+Tab lifts it; elsewhere Tab leaves the editor.
        if (e.key !== "Tab" || !editor.api.some({ match: (n) => !!(n as MailNode).listStyleType })) return;
        e.preventDefault();
        if (e.shiftKey) outdentList(editor);
        else indentList(editor);
      }}
    />
  );
};

const Tool = ({
  icon: Icon,
  label,
  pressed,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  pressed: boolean;
  onPress: () => void;
}) => (
  <Toggle
    size="sm"
    aria-label={label}
    title={label}
    pressed={pressed}
    // Keep the caret (and selection) in the editor.
    onMouseDown={(e) => e.preventDefault()}
    onPressedChange={onPress}
  >
    <Icon />
  </Toggle>
);

const MarkTool = ({ mark, icon, label }: { mark: string; icon: LucideIcon; label: string }) => {
  const editor = useEditorRef();
  const pressed = useEditorSelector((e) => !!e.api.marks()?.[mark], [mark]);
  return <Tool icon={icon} label={label} pressed={pressed} onPress={() => editor.tf.toggleMark(mark)} />;
};

const BlockTool = ({ type, icon, label }: { type: string; icon: LucideIcon; label: string }) => {
  const editor = useEditorRef();
  const pressed = useEditorSelector((e) => e.api.some({ match: { type } }), [type]);
  return <Tool icon={icon} label={label} pressed={pressed} onPress={() => editor.tf.toggleBlock(type)} />;
};

const ListTool = ({ style, icon, label }: { style: string; icon: LucideIcon; label: string }) => {
  const editor = useEditorRef();
  const pressed = useEditorSelector((e) => someList(e, style), [style]);
  return (
    <Tool
      icon={icon}
      label={label}
      pressed={pressed}
      onPress={() => {
        toggleList(editor, { listStyleType: style });
        editor.tf.focus();
      }}
    />
  );
};

const LinkTool = () => {
  const editor = useEditorRef();
  const inLink = useEditorSelector((e) => e.api.some({ match: { type: KEYS.link } }), []);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  if (inLink) {
    return <Tool icon={Unlink} label="Remove link" pressed={false} onPress={() => unwrapLink(editor)} />;
  }

  const apply = () => {
    const href = url.trim();
    if (!href) return;
    upsertLink(editor, { url: /^[a-z]+:/i.test(href) ? href : `https://${href}` });
    setOpen(false);
    setUrl("");
    editor.tf.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" aria-label="Link" title="Link" pressed={open} onMouseDown={(e) => e.preventDefault()}>
          <Link />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex gap-2">
          <Input
            autoFocus
            className="h-8"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                apply();
              }
            }}
          />
          <Button type="button" size="sm" className="h-8" disabled={!url.trim()} onClick={apply}>
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/** Classic formatting: marks, heading, quote, lists, link. */
export const MailToolbar = ({ className }: { className?: string }) => (
  <div className={cn("flex flex-wrap items-center gap-0.5", className)}>
    <MarkTool mark={KEYS.bold} icon={Bold} label="Bold (⌘B)" />
    <MarkTool mark={KEYS.italic} icon={Italic} label="Italic (⌘I)" />
    <MarkTool mark={KEYS.underline} icon={Underline} label="Underline (⌘U)" />
    <MarkTool mark={KEYS.strikethrough} icon={Strikethrough} label="Strikethrough" />
    <MarkTool mark={KEYS.code} icon={Code} label="Code" />
    <Separator orientation="vertical" className="mx-1 h-4" />
    <BlockTool type={KEYS.h3} icon={Heading} label="Heading" />
    <BlockTool type={KEYS.blockquote} icon={Quote} label="Quote" />
    <ListTool style="disc" icon={List} label="Bulleted list" />
    <ListTool style="decimal" icon={ListOrdered} label="Numbered list" />
    <Separator orientation="vertical" className="mx-1 h-4" />
    <LinkTool />
  </div>
);
