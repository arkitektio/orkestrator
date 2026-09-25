import {
  BoldPlugin,
  CodePlugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold,
  Code,
  FileImage,
  Italic,
  Paperclip,
  Send,
  SmilePlus,
  Type,
  Underline,
} from "lucide-react";
import { StructureInput } from "@/alpaka/api/graphql";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import React, { useState } from "react";
import { EmojiPicker } from "@/core/components/emoji-picker";
import { Button } from "@/core/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";

interface ChatBottombarProps {
  sendMessage: (text: string) => void;
  isMobile: boolean;
  stagedStructures: StructureInput[];
  onRemoveStructure: (index: number) => void;
  prefillText?: string;
  replyerControl?: React.ReactNode;
}

type ComposerTextNode = {
  text?: string;
  children?: ComposerTextNode[];
};

export const BottombarIcons = [{ icon: FileImage }, { icon: Paperclip }];

export default function ChatBottombar({
  sendMessage,
  stagedStructures,
  onRemoveStructure,
  prefillText,
  replyerControl,
}: ChatBottombarProps) {
  const [hasContent, setHasContent] = useState(false);

  const editor = usePlateEditor({
    plugins: [BoldPlugin, UnderlinePlugin, CodePlugin, ItalicPlugin],
    value: [
      {
        type: "p",
        children: [{ text: "" }],
      },
    ],
  });

  const serialize = (nodes: ComposerTextNode[]) => {
    return nodes.map(node => {
      if (node.children) {
        return node.children.map((child) => child.text || (child.children ? serialize([child]) : '')).join('')
      }
      return node.text || ''
    }).join('\n')
  }

  const checkContent = React.useCallback(() => {
    const text = serialize(editor.children)
    setHasContent(!!text.trim() || stagedStructures.length > 0)
  }, [editor.children, stagedStructures])

  React.useEffect(() => {
    if (prefillText) {
      editor.tf.setValue([
        {
          type: "p",
          children: [{ text: prefillText }],
        },
      ]);
    }
  }, [prefillText, editor]);

  React.useEffect(() => {
    checkContent();
  }, [stagedStructures, editor.children, checkContent]);

  const handleSend = () => {
    const message = serialize(editor.children);
    if (message.trim() || stagedStructures.length > 0) {
      sendMessage(message.trim());
      editor.tf.setValue([{ type: "p", children: [{ text: "" }] }]);
      setHasContent(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full mb-4">
      <div className="flex w-full items-end">

      <AnimatePresence initial={false}>
        <motion.div
          key="input"
          className="w-full relative"
          layout
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{
            opacity: { duration: 0.05 },
            layout: {
              type: "spring",
              bounce: 0.15,
            },
          }}
        >
          <Plate editor={editor} onChange={checkContent}>
            <div className="w-full overflow-hidden rounded-2xl border bg-background shadow-sm">
              {stagedStructures.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-2 border-b border-border/30 bg-muted/10">
                  <span
                    className="flex items-center gap-1 text-[11px] text-muted-foreground select-none"
                    title="Sent along with your message"
                  >
                    <Paperclip className="h-3 w-3" />
                    Attached
                  </span>
                  {stagedStructures.map((structure, idx) => (
                    <div
                      key={`${structure.identifier}-${structure.object}-${idx}`}
                      className="relative group flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-xl border border-primary/60 bg-pane text-[11px] font-medium max-w-[240px] shadow-xs"
                    >
                      <span className="truncate text-muted-foreground select-none">
                        {structure.identifier.split(".").pop() || structure.identifier}:
                      </span>
                      <span className="font-mono text-[10px] text-foreground font-semibold truncate">
                        {structure.object}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveStructure(idx)}
                        aria-label="Remove attachment"
                        title="Remove attachment"
                        className="h-4.5 w-4.5 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <PlateContent
                className="min-h-[72px] w-full resize-none px-4 py-3 text-sm leading-6 focus-visible:outline-none max-h-[220px] overflow-y-auto"
                placeholder="Write a message..."
                onKeyDown={handleKeyPress}
              />
              <div className="flex flex-wrap items-center gap-1 border-t bg-muted/20 px-2 py-2 @container">
                {replyerControl && (
                  <>
                    {replyerControl}
                    <div className="mx-1 h-5 w-px bg-border/60" />
                  </>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground @xs:visible invisible"
                      title="Formatting"
                    >
                      <Type className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="top"
                    className="flex w-auto items-center gap-1 p-1 flex-row"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => editor.tf.toggleMark("bold")}
                      className="h-8 w-8 p-0"
                    >
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => editor.tf.toggleMark("italic")}
                      className="h-8 w-8 p-0"
                    >
                      <Italic className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => editor.tf.toggleMark("underline")}
                      className="h-8 w-8 p-0"
                    >
                      <Underline className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => editor.tf.toggleMark("code")}
                      className="h-8 w-8 p-0"
                    >
                      <Code className="h-3 w-3" />
                    </Button>
                    <EmojiPicker
                      onChange={(value) => {
                        editor.tf.insertText(value);
                        editor.tf.focus();
                      }}
                    >
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <SmilePlus className="h-4 w-4" />
                      </Button>
                    </EmojiPicker>
                  </PopoverContent>
                </Popover>
                <div className="flex-1" />
                <Button
                  size="sm"
                  type="button"
                  variant="default"
                  disabled={!hasContent}
                  onClick={handleSend}
                  className=" rounded-xl"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </Plate>
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
