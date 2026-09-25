import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/core/components/ui/empty";
import { Guard } from "@/core/app/Arkitekt";
import { Identifier, Object } from "@/core/types";
import { Check, Menu, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StructureInput,
  useCreateRoomMutation,
  useGetRoomQuery,
  useListRoomsQuery,
  WatchMessagesDocument,
  WatchMessagesSubscription,
  WatchMessagesSubscriptionVariables,
} from "../api/graphql";
import { Chat } from "@/alpaka/chat/chat";
import { storeRoomTalkingAbout, toStructureInput } from "../roomTalkingAbout";

export type StructureRoomsSidebarProps = {
  identifier: Identifier;
  object: Object;
};

type RankableRoom = { id: string; messages: readonly { createdAt: unknown }[] };

const lastMessageAt = (room: RankableRoom): number =>
  room.messages.reduce((newest, message) => {
    const at = Date.parse(String(message.createdAt));
    return Number.isNaN(at) ? newest : Math.max(newest, at);
  }, Number.NEGATIVE_INFINITY);

/**
 * The chat the tab opens on: the one that was talked in most recently.
 *
 * `Room` exposes no timestamp of its own and `rooms` takes no ordering, so
 * recency is read off the messages the list query already carries. A room
 * nobody has written in yet has nothing to compare with, so it loses to any
 * room that does have a message; between two of those, the one created last
 * wins — by id, which alpaka hands out ascending, and by list position when
 * ids aren't numeric.
 */
const latestRoomId = (rooms: readonly RankableRoom[]): string => {
  let best: { id: string; at: number; rank: number } | undefined;

  rooms.forEach((room, index) => {
    const numericId = Number(room.id);
    const candidate = {
      id: room.id,
      at: lastMessageAt(room),
      rank: Number.isFinite(numericId) ? numericId : index,
    };

    if (
      !best ||
      candidate.at > best.at ||
      (candidate.at === best.at && candidate.rank >= best.rank)
    ) {
      best = candidate;
    }
  });

  return best?.id ?? "";
};

const buildSidebarStorageKey = (identifier: Identifier, object: Object) =>
  `alpaka-structure-rooms:${identifier}:${object.id}`;

const StructureRoomView = ({
  roomId,
  talkingAbout,
}: {
  roomId: string;
  talkingAbout: StructureInput;
}) => {
  const { data, loading, error, subscribeToMore } = useGetRoomQuery({
    variables: {
      id: roomId,
    },
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);

    return () => {
      window.removeEventListener("resize", checkScreenWidth);
    };
  }, []);

  useEffect(() => {
    return subscribeToMore<
      WatchMessagesSubscription,
      WatchMessagesSubscriptionVariables
    >({
      document: WatchMessagesDocument,
      variables: {
        room: roomId,
        agentId: "default",
      },
      updateQuery: (prev, options) => {
        const nextMessage = options.subscriptionData.data.room.message;

        if (!nextMessage) {
          return prev;
        }

        if (prev.room.messages.some((message) => message.id === nextMessage.id)) {
          return prev;
        }

        return {
          room: {
            ...prev.room,
            messages: prev.room.messages.concat([nextMessage]),
          },
        };
      },
    });
  }, [roomId, subscribeToMore]);

  if (loading && !data) {
    return <div className="p-3 text-xs text-muted-foreground">Loading room…</div>;
  }

  if (error) {
    return <div className="p-3 text-xs text-destructive">{error.message}</div>;
  }

  if (!data?.room) {
    return <div className="p-3 text-xs text-muted-foreground">Room unavailable.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg ">
      {/* `Chat` talks to rekuest (and kabinet) for its action picker, so it
          must not mount at all without that service — guarded from out here,
          before its hooks can fire. */}
      <Guard.Rekuest
        unavailable={
          <div className="p-3 text-xs text-muted-foreground">
            Chat needs the rekuest service.
          </div>
        }
      >
        <Chat isMobile={isMobile} room={data.room} talkingAbout={[talkingAbout]} />
      </Guard.Rekuest>
    </div>
  );
};

const STRUCTURE_ROOMS_SIDEBAR_KEY = "structure-rooms-sidebar-accordion";

export const StructureRoomsSidebar = ({
  identifier,
  object,
}: StructureRoomsSidebarProps) => {
  const storageKey = `${STRUCTURE_ROOMS_SIDEBAR_KEY}:${buildSidebarStorageKey(identifier, object)}`;
  // Alpaka addresses foreign objects by a numeric id. A structure whose id
  // isn't one cannot be talked about, and asking anyway would have the server
  // reject the whole query.
  const talkingAbout = toStructureInput({ identifier, id: object.id });
  const { data, loading, error, refetch } = useListRoomsQuery({
    skip: !talkingAbout,
    variables: {
      filter: {
        talkingAbout: talkingAbout ?? undefined,
      },
      pagination: {
        limit: 20,
      },
    },
  });
  const [createRoom, { loading: creatingRoom }] = useCreateRoomMutation();
  const [activeRoomId, setActiveRoomId] = useState<string>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || "";
  });

  useEffect(() => {
    if (activeRoomId) {
      localStorage.setItem(storageKey, activeRoomId);
    }
  }, [activeRoomId, storageKey]);

  // A room picked or opened during THIS session is trusted as-is; only an id
  // restored from localStorage is validated against the list, which is what
  // that check is for (the room may have been deleted since). A freshly
  // created room can lag its own filtered query by a beat, and validating it
  // would drop the user back into an older chat.
  const pickedThisSession = useRef(false);
  const selectRoom = useCallback((roomId: string) => {
    pickedThisSession.current = true;
    setActiveRoomId(roomId);
  }, []);

  const rooms = data?.rooms ?? [];

  const resolvedActiveRoomId = (() => {
    // Nothing chosen yet — open on the most recent conversation, which is what
    // the tab is for. A room the user picked from the menu sticks instead.
    const fallback = latestRoomId(rooms);

    if (!activeRoomId) return fallback;
    if (pickedThisSession.current) return activeRoomId;

    return rooms.some((room) => room.id === activeRoomId)
      ? activeRoomId
      : fallback;
  })();

  const handleCreateRoom = useCallback(async () => {
    if (!talkingAbout) {
      return;
    }

    const result = await createRoom({
      variables: {
        input: {
          title: `Chat about ${identifier}`,
          description: `Talking about ${object.id}`,
          talkingAbout: [talkingAbout],
        },
      },
    });

    const nextRoomId = result.data?.createRoom.id;
    await refetch();

    if (nextRoomId) {
      storeRoomTalkingAbout(nextRoomId, [talkingAbout]);
      selectRoom(nextRoomId);
    }
  }, [createRoom, identifier, object.id, refetch, selectRoom, talkingAbout]);

  if (!talkingAbout) {
    return (
      <Empty>
        <EmptyTitle>Not chattable</EmptyTitle>
        <EmptyDescription>
          Alpaka cannot hold a conversation about this object.
        </EmptyDescription>
      </Empty>
    );
  }

  if (error) {
    return (
      <Empty>
        <EmptyTitle>Error loading rooms</EmptyTitle>
        <EmptyDescription>
          There was an error loading the conversations about this structure.
        </EmptyDescription>
        <EmptyContent>{error.message}</EmptyContent>
      </Empty>
    );
  }

  if (loading && rooms.length === 0) {
    return <div className="p-3 text-xs text-muted-foreground">Loading chats…</div>;
  }

  if (!resolvedActiveRoomId) {
    return (
      <Empty>
        <EmptyTitle>No chats yet</EmptyTitle>
        <EmptyDescription>
          There are no Alpaka conversations about this yet.
        </EmptyDescription>
        <EmptyContent>
          <Button onClick={handleCreateRoom} disabled={creatingRoom} variant="outline">
            <Plus className="h-4 w-4" />
            {creatingRoom ? "Opening…" : "New chat"}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Switch chat</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-w-72">
            <DropdownMenuLabel>Chats about this</DropdownMenuLabel>
            {rooms.map((room) => (
              <DropdownMenuItem key={room.id} onSelect={() => selectRoom(room.id)}>
                <Check
                  className={
                    room.id === resolvedActiveRoomId
                      ? "h-4 w-4 shrink-0"
                      : "h-4 w-4 shrink-0 opacity-0"
                  }
                />
                <span className="truncate">{room.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleCreateRoom}
          disabled={creatingRoom}
        >
          <Plus className="h-4 w-4" />
          {creatingRoom ? "Opening…" : "New chat"}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {resolvedActiveRoomId && (
          <StructureRoomView
            key={resolvedActiveRoomId}
            roomId={resolvedActiveRoomId}
            talkingAbout={talkingAbout}
          />
        )}
      </div>
    </div>
  );
};

export default StructureRoomsSidebar;
