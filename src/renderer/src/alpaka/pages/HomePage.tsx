import { Guard } from "@/core/connection/arkitekt/host";
import { PageLayout } from "@/core/layout/PageLayout";
import { Sidebars } from "@/core/layout/Sidebars";
import { HelpSidebar } from "@/core/layout/help";
import { Button } from "@/core/ui/button";
import { Skeleton } from "@/core/ui/skeleton";
import { Textarea } from "@/core/ui/textarea";
import Timestamp from "@/core/ui/timestamp";
import { AlpakaRoom } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import { useSelf } from "@/core/connection/useSelf";

import {
  ArrowRight,
  ArrowUp,
  MessageSquarePlus,
  MessageSquareText,
  Paperclip,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { HomeEmpty, HomeSection, ModuleHome } from "@/core/layout/ModuleHome";
import { Link, useNavigate } from "react-router-dom";
import { reportError } from "@/core/notify";
import { useCreateRoomMutation, useRecentRoomsQuery } from "../api/graphql";
import {
  greeting,
  rankRecentRooms,
  RecentRoom,
  titleFromPrompt,
} from "../recentRooms";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";
import { ALPAKA_HELP } from "../help";

/** The signed-in user's name (host identity, not a lok query). */
const Username = () => <>{useSelf().username}</>;

/**
 * The server orders rooms by creation, not by their latest message, so a
 * wider window is fetched and ranked here; the page shows the first few.
 */
const RECENT_LIMIT = 50;
/** The big card plus a few rows: the Rooms page has the rest. */
const RECENT_SHOWN = 13;

/** Hands the prompt to the room's own composer, where the replyer is picked. */
const roomLink = (id: string, text?: string) =>
  AlpakaRoom.linkBuilder(id) + (text ? `?${new URLSearchParams({ text })}` : "");

const useStartChat = () => {
  const navigate = useNavigate();
  const [createRoom, { loading }] = useCreateRoomMutation({
    refetchQueries: ["RecentRooms", "Rooms"],
  });

  const start = async (prompt?: string) => {
    try {
      const { data } = await createRoom({
        variables: {
          input: { title: prompt ? titleFromPrompt(prompt) : "New chat" },
        },
      });
      if (data?.createRoom) navigate(roomLink(data.createRoom.id, prompt?.trim()));
    } catch (e) {
      reportError(e, "Couldn't start a chat");
    }
  };

  return { start, loading };
};

const Composer = () => {
  const [prompt, setPrompt] = useState("");
  const { start, loading } = useStartChat();
  const submit = () => {
    if (prompt.trim() && !loading) start(prompt);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="group relative rounded-xl border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring/40"
    >
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        placeholder="Start a new chat — ask about your data, experiments or anything else…"
        className="min-h-20 resize-none border-0 bg-transparent px-5 pt-4 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="text-[0.65rem] text-muted-foreground">
          Enter to start · Shift + Enter for a new line
        </span>
        <Button
          type="submit"
          size="icon"
          className="rounded-full"
          disabled={!prompt.trim() || loading}
          aria-label="Start chat"
        >
          <ArrowUp />
        </Button>
      </div>
    </form>
  );
};

const ContinueCard = ({ room }: { room: RecentRoom }) => (
  <Link
    to={roomLink(room.id)}
    className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-primary">
        Pick up where you left off
      </span>
      <span className="text-[0.65rem] text-muted-foreground">
        <Timestamp date={room.lastActivity} relative />
      </span>
    </div>
    <h2 className="line-clamp-1 text-xl font-semibold tracking-tight">{room.title}</h2>
    <p className="line-clamp-3 text-sm text-muted-foreground">
      {room.preview ?? room.description ?? "No messages yet — say hello."}
    </p>
    <span className="mt-1 flex items-center gap-1 text-xs font-medium">
      Continue chat
      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </span>
  </Link>
);

const RoomRow = ({ room }: { room: RecentRoom }) => {
  const attachments = room.latest[0]?.attachedStructures.length ?? 0;

  return (
    <AlpakaRoom.Smart object={room}>
      <Link
        to={roomLink(room.id)}
        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-background">
          <MessageSquareText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium">{room.title}</span>
            <span className="shrink-0 text-[0.65rem] tabular-nums text-muted-foreground">
              <Timestamp date={room.lastActivity} relative />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate text-xs text-muted-foreground",
                !room.preview && "italic",
              )}
            >
              {room.preview ?? "No messages yet"}
            </p>
            {attachments > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 text-[0.65rem] text-muted-foreground">
                <Paperclip className="size-3" />
                {attachments}
              </span>
            )}
          </div>
        </div>
      </Link>
    </AlpakaRoom.Smart>
  );
};

/**
 * The newest chats: the latest as the big "pick up" card, the next ones as
 * rows beside each other. Searching and the full history are the Rooms page's.
 */
const RecentChats = () => {
  const { data, loading, error } = useRecentRoomsQuery({
    variables: { pagination: { limit: RECENT_LIMIT } },
    fetchPolicy: "cache-and-network",
  });
  const { start, loading: starting } = useStartChat();

  const rooms = useMemo(() => rankRecentRooms(data?.rooms ?? []).slice(0, RECENT_SHOWN), [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-sm text-destructive">Could not load chats: {error.message}</p>;
  }

  if (rooms.length === 0) {
    return (
      <HomeEmpty title="No chats yet">
        Ask a question above to start your first conversation.
      </HomeEmpty>
    );
  }

  const [latest, ...rest] = rooms;

  return (
    <HomeSection
      title={
        <span className="flex w-full items-center justify-between gap-2">
          Recent chats
          <span className="flex items-center gap-1 normal-case tracking-normal">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => start()}
              disabled={starting}
            >
              <MessageSquarePlus /> New
            </Button>
            <AlpakaRoom.ListLink className="text-[11px] font-normal text-muted-foreground hover:text-foreground">
              All chats →
            </AlpakaRoom.ListLink>
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <ContinueCard room={latest} />
        {rest.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-1">
            {rest.map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </HomeSection>
  );
};

const Page: React.FC = () => (
  <PageLayout
    help={ALPAKA_HELP.home}
    title="Alpaka"
    sidebars={
      <Sidebars>
        <Sidebars.Tab label="Statistics">
          <HomePageStatisticsSidebar />
        </Sidebars.Tab>
        <Sidebars.Tab label="Help">
          <HelpSidebar />
        </Sidebars.Tab>
      </Sidebars>
    }
  >
    <ModuleHome
      moduleKey="alpaka"
      title={
        <>
          {greeting()}
          <Guard.Lok notConnectedFallback={<></>} connectingFallback={<></>}>
            , <Username />
          </Guard.Lok>
        </>
      }
      description="Chat with agents about your data, experiments or anything else."
      lead={<Composer />}
    >
      <RecentChats />
    </ModuleHome>
  </PageLayout>
);

export default Page;
