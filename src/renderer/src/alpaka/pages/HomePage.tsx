import { Guard } from "@/app/Arkitekt";
import { PageLayout } from "@/components/layout/PageLayout";
import { Sidebars } from "@/components/layout/Sidebars";
import { HelpSidebar } from "@/components/sidebars/help";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import Timestamp from "@/components/ui/timestamp";
import { AlpakaRoom } from "@/linkers";
import { cn } from "@/lib/utils";
import { useSelf } from "@/app/hooks/useSelf";

import {
  ArrowRight,
  ArrowUp,
  Brain,
  Database,
  MessageSquarePlus,
  MessageSquareText,
  Paperclip,
  Plug,
  Search,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCreateRoomMutation, useRecentRoomsQuery } from "../api/graphql";
import {
  greeting,
  groupByBucket,
  rankRecentRooms,
  RecentRoom,
  titleFromPrompt,
} from "../recentRooms";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";

/** The signed-in user's name (host identity, not a lok query). */
const Username = () => <>{useSelf().username}</>;

const RECENT_LIMIT = 50;

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
      toast.error(`Could not start a chat: ${(e as Error).message}`);
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
      className="group relative rounded-3xl border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring/40"
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
    className="group relative flex flex-col gap-3 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
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

const RecentChats = () => {
  const [search, setSearch] = useState("");
  const { data, loading, error } = useRecentRoomsQuery({
    variables: { pagination: { limit: RECENT_LIMIT } },
    fetchPolicy: "cache-and-network",
  });
  const { start, loading: starting } = useStartChat();

  const rooms = useMemo(() => rankRecentRooms(data?.rooms ?? []), [data]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rooms;
    return rooms.filter((room) =>
      `${room.title} ${room.preview ?? ""} ${room.description ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [rooms, search]);

  // While browsing, the newest chat gets the big card and is left out of the list.
  const latest = search ? undefined : filtered[0];
  const groups = useMemo(
    () => groupByBucket(search ? filtered : filtered.slice(1)),
    [filtered, search],
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-40 rounded-3xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-sm text-destructive">Could not load chats: {error.message}</p>;
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed py-14 text-center">
        <MessageSquarePlus className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">No chats yet</p>
          <p className="text-xs text-muted-foreground">
            Ask a question above to start your first conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Recent chats</h2>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter chats"
              className="h-7 w-44 rounded-full pl-8 text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => start()}
            disabled={starting}
          >
            <MessageSquarePlus /> New
          </Button>
        </div>
      </div>

      {latest && <ContinueCard room={latest} />}

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No chats match “{search}”.
        </p>
      )}

      {groups.map(({ bucket, rooms }) => (
        <section key={bucket} className="flex flex-col">
          <h3 className="px-3 pb-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
            {bucket}
          </h3>
          {rooms.map((room) => (
            <RoomRow key={room.id} room={room} />
          ))}
        </section>
      ))}

      {rooms.length >= RECENT_LIMIT && (
        <AlpakaRoom.ListLink className="self-center text-xs text-muted-foreground hover:text-foreground">
          View all chats →
        </AlpakaRoom.ListLink>
      )}
    </div>
  );
};

const SETUP_LINKS = [
  { to: "/alpaka/llmmodels", label: "Models", hint: "LLMs you can chat with", icon: Brain },
  { to: "/alpaka/providers", label: "Providers", hint: "Connected model APIs", icon: Plug },
  {
    to: "/alpaka/collections",
    label: "Collections",
    hint: "Knowledge for retrieval",
    icon: Database,
  },
];

const Page: React.FC = () => (
  <PageLayout
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:py-12">
      <header className="flex flex-col gap-5">
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting()}
          <Guard.Lok notConnectedFallback={<></>} connectingFallback={<></>}>
            , <Username />
          </Guard.Lok>
        </h1>
        <Composer />
      </header>

      <RecentChats />

      <nav className="grid gap-2 border-t pt-6 sm:grid-cols-3">
        {SETUP_LINKS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20"
          >
            <Icon className="size-4 text-muted-foreground group-hover:text-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium">{label}</p>
              <p className="truncate text-[0.65rem] text-muted-foreground">{hint}</p>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  </PageLayout>
);

export default Page;
