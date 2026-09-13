import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlpakaRoom } from "@/linkers";
import { ArrowUpRight, MessageSquareText, Paperclip } from "lucide-react";
import { ListRoomFragment, RoomFragment } from "../../api/graphql";

interface Props {
  item: RoomFragment | ListRoomFragment;
  index?: number;
}

const getRoomCardLayout = (index: number) => {
  if (index % 7 === 0) {
    return "min-h-72 @xl:col-span-2 @3xl:col-span-2";
  }

  if (index % 5 === 2) {
    return "min-h-60 @2xl:col-span-2";
  }

  return "min-h-48";
};

const TheCard = ({ item, index = 0 }: Props) => {
  const messages = "messages" in item ? item.messages : [];
  const latestMessage = messages.at(-1) ?? messages.at(0);
  const latestPreview = latestMessage?.text?.trim();
  const attachedStructureCount = latestMessage?.attachedStructures.length ?? 0;

  return (
    <AlpakaRoom.Smart object={item}>
      <Card
        className={cn(
          "h-full border-border/60 bg-card shadow-sm",
          getRoomCardLayout(index),
        )}
      >
        <CardHeader className="gap-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/60">
              <MessageSquareText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 ? (
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {messages.length} {messages.length === 1 ? "message" : "messages"}
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full text-[10px]">
                Room
              </Badge>
            </div>
          </div>

          <CardTitle className="text-base font-semibold leading-tight">
            <AlpakaRoom.DetailLink
              object={item}
              className="line-clamp-2 transition-colors hover:text-foreground/80"
            >
              {item.title}
            </AlpakaRoom.DetailLink>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 pt-0">
          <p className="line-clamp-4 text-sm text-muted-foreground">
            {item.description?.trim() || "Open this Alpaka room to continue the conversation."}
          </p>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Latest Activity
              </span>
              {attachedStructureCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  {attachedStructureCount}
                </span>
              ) : null}
            </div>

            <p className="line-clamp-5 text-sm text-foreground/90">
              {latestPreview || "No messages yet. Start the conversation from this room."}
            </p>
          </div>
        </CardContent>

        <CardFooter className="mt-auto justify-between border-t border-border/60 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Open room</span>
          <ArrowUpRight className="h-4 w-4" />
        </CardFooter>
      </Card>
    </AlpakaRoom.Smart>
  );
};

export default React.memo(TheCard);