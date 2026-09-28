import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/core/ui/resizable";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { Kbd, KbdGroup } from "@/core/ui/kbd";
import { Mail } from "lucide-react";
import React from "react";
import { MessageReader } from "./MessageReader";
import { useMailSelection } from "./selection";
import { ThreadReader } from "./ThreadReader";

/**
 * The classic mail layout: the list on the left, the selected conversation
 * (or mail) on the right, the divider draggable and remembered. `top` sits
 * above the list (a problem banner, a note), scrolling with it.
 */
export const MailSplit = ({ list, top }: { list: React.ReactNode; top?: React.ReactNode }) => {
  const { selected } = useMailSelection();

  return (
    // The page body pads by p-3 and scrolls; the split goes edge to edge and
    // scrolls each side on its own instead.
    <div className="-m-3 flex min-h-0 flex-1">
      <ResizablePanelGroup direction="horizontal" autoSaveId="kuvert:split">
        <ResizablePanel id="list" order={1} defaultSize={38} minSize={22} maxSize={65}>
          <div className="flex h-full flex-col overflow-y-auto">
            {top}
            {list}
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="reader" order={2} defaultSize={62} minSize={30}>
          <div className="h-full overflow-y-auto bg-background">
            {selected?.kind === "thread" && <ThreadReader key={selected.id} id={selected.id} />}
            {selected?.kind === "message" && <MessageReader key={selected.id} id={selected.id} />}
            {!selected && (
              <Empty className="h-full border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Mail />
                  </EmptyMedia>
                  <EmptyTitle>No mail selected</EmptyTitle>
                  <EmptyDescription>
                    Pick one from the list, or walk it with{" "}
                    <KbdGroup>
                      <Kbd>↑</Kbd>
                      <Kbd>↓</Kbd>
                    </KbdGroup>
                    .
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
