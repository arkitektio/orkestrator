import { Button } from "@/core/ui/button";
import { DescendantInput, DescendantKind } from "@/kraph/api/graphql";
import { BoldPlugin, CodePlugin, UnderlinePlugin } from "@platejs/basic-nodes/react";
import { MentionPlugin } from "@platejs/mention/react";
import {
  Bold,
  Code,
  Italic,
  Send,
  Underline,
} from "lucide-react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useState } from "react";
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

    // Handle mention nodes. The input field stays `user` even though the read
    // side calls it `subject` — kraph keeps the write shape compatible with
    // lok's tree, so only the render path renames.
    if (node.type === 'mention') {
      return [
        {
          kind: DescendantKind.Mention,
          user: node.value,
          text: node.children?.[0]?.text || '',
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

export const CommentEdit = ({
  commentOnStructure,
  object,
  parent,
  identifier,
}: CommentEditProps) => {
  const [saving, setSaving] = useState(false);

  const editor = usePlateEditor({
    plugins: [BoldPlugin, UnderlinePlugin, CodePlugin, MentionPlugin],
    value: [
      {
        type: 'p',
        children: [{ text: '' }],
      },
    ],
  });


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
      .catch(console.error)
      .then(() => {
        setSaving(false);
        editor.tf.reset();
      });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      saveComment();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 min-h-32 ">
      <Plate editor={editor}>
        <div className="relative rounded-lg border bg-background/20 h-full">
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
          />
        </div>
      </Plate>
    </div>
  );
};
