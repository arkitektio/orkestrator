import { DisplayWidgetProps } from "@/lib/display/registry";
import { AlpakaMessage, AlpakaRoom } from "@/linkers";
import { useGetMessageQuery } from "../api/graphql";
import { agentDisplayName, displayInitials } from "../agentName";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StructureDisplay } from "@/components/display/StructureDisplay";
import { Markdown } from "@/components/ui/markdown";

export const MessageDisplay = (props: DisplayWidgetProps) => {
  const { data, loading } = useGetMessageQuery({
    variables: {
      id: props.id,
    },
    skip: !props.id,
  });

  const message = data?.message;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground animate-pulse">
        Loading message...
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        Message not found
      </div>
    );
  }

  const room = message.room;
  const senderName = agentDisplayName(message.agent, "Unknown");
  const messageTimestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (props.context === "command") {
    return (
      <AlpakaMessage.Smart object={message}>
        <AlpakaRoom.DetailLink object={room}>
          <div className="flex items-center gap-2 min-w-0 hover:text-foreground/80 transition-colors">
            <span className="font-semibold text-xs text-primary shrink-0">
              {senderName}
            </span>
            <span className="text-xs truncate text-muted-foreground">
              {message.text ||
                (message.attachedStructures.length > 0 ? "Sent attachments" : "")}
            </span>
          </div>
        </AlpakaRoom.DetailLink>
      </AlpakaMessage.Smart>
    );
  }

  return (
    <AlpakaMessage.Smart object={message}>
      <AlpakaRoom.DetailLink object={room}>
        <Card className="border-border/60 bg-card/95 shadow-md overflow-hidden transition-colors hover:border-primary/45">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-3">
                <Avatar size="lg" className="border bg-muted/60 shadow-sm" title={senderName}>
                  <AvatarFallback className="bg-muted/60 text-xs font-semibold text-muted-foreground">
                    {displayInitials(senderName, "AI")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground/90">
                    {senderName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {messageTimestamp}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{room.title}</span>
                <ArrowUpRight className="h-3 w-3 shrink-0" />
              </div>
            </div>

            {message.text && <Markdown text={message.text} isOwn={false} />}

            {message.attachedStructures.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border/50 p-2.5 bg-muted/30">
                {message.attachedStructures.map((s, index) => (
                  <div
                    key={`${message.id}-${s.identifier}-${s.object}-${index}`}
                    className="overflow-hidden rounded-lg shadow-sm border bg-background"
                  >
                    <StructureDisplay identifier={s.identifier} id={String(s.object)} small />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AlpakaRoom.DetailLink>
    </AlpakaMessage.Smart>
  );
};
