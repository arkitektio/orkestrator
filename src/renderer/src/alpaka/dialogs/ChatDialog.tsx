import { Role, useChatMutation } from "@/alpaka/api/graphql";
import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BoldPlugin, CodePlugin, ItalicPlugin, UnderlinePlugin } from "@platejs/basic-nodes/react";
import {
  Bold,
  Code,
  Italic,
  Send,
  Underline,
} from "lucide-react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { useState } from "react";
import { toast } from "sonner";

export const ChatDialog = (props: { model: string }) => {
  const [chat, { loading }] = useChatMutation();
  const [response, setResponse] = useState<string | null>(null);

  const { closeDialog } = useDialog();

  const editor = usePlateEditor({
    plugins: [BoldPlugin, UnderlinePlugin, CodePlugin, ItalicPlugin],
    value: [
      {
        type: 'p',
        children: [{ text: '' }],
      },
    ],
  });

  const serialize = (nodes: any[]) => {
    return nodes.map(node => {
      if (node.children) {
        return node.children.map((child: any) => child.text || (child.children ? serialize([child]) : '')).join('')
      }
      return node.text || ''
    }).join('\n')
  }


  const handleChat = async () => {
    const message = serialize(editor.children);
    if (!message) return;

    try {
      const result = await chat({
        variables: {
          input: {
            model: props.model,
            messages: [
              {
                role: Role.User,
                content: message,
              },
            ],
          },
        },
      });

      if (result.data?.chat?.choices?.[0]?.message?.content) {
        setResponse(result.data.chat.choices[0].message.content);
        toast.success("Chat response received");
        editor.tf.setValue([{ type: 'p', children: [{ text: '' }] }]);
      } else {
        toast.error("No response received");
      }
    } catch (error) {
      toast.error("Failed to chat with model");
      console.error(error);
    }
  };


  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      handleChat();
    }
  };


  return (
    <>
      <DialogHeader>
        <DialogTitle>Chat with Model</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-4 min-w-[500px]">
        <div className="flex flex-col gap-2 p-3 min-h-32 ">
          <Plate editor={editor}>
            <div className="relative rounded-lg border bg-background/20 h-full">
              <div className="flex items-center gap-1 border-b px-3 py-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => editor.tf.toggleMark('bold')}
                  className=" p-0 h-6 w-6"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => editor.tf.toggleMark('italic')}
                  className=" p-0 h-6 w-6"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => editor.tf.toggleMark('underline')}
                  className="p-0 h-6 w-6"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => editor.tf.toggleMark('code')}
                  className="p-0 h-6 w-6"
                >
                  <Code className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleChat()}
                  disabled={loading}
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </>
                  )}
                </Button>
              </div>
              <PlateContent
                className="h-full px-3 py-2 text-sm focus-visible:outline-none min-h-[100px]"
                placeholder="Message..."
                onKeyDown={handleKeyDown}
              />
            </div>
          </Plate>
        </div>


        {response && (
          <div className="mt-4 p-4 bg-muted rounded-md max-h-[300px] overflow-y-auto">
            <h4 className="text-sm font-semibold mb-2">Response:</h4>
            <p className="text-sm whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={closeDialog}
          disabled={loading}
        >
          Close
        </Button>
      </DialogFooter>
    </>
  );
};
