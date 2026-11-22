import { Button } from "@/core/ui/button";
import { reportErrorAs } from "@/core/notify/reportError";
import { createContext, useCallback, useContext, useState } from "react";
import { useAlpaka } from "../api/funcs";
import {
  GetRoomDocument,
  RoomMessagesDocument,
  type GetRoomQuery,
  type ListMessageFragment,
  type RoomMessagesQuery,
  type RoomMessagesQueryVariables,
} from "../api/graphql";

/** How many older messages "Load earlier" asks for at a time. */
export const EARLIER_PAGE = 50;

/**
 * A room's messages after an older page arrived: the ones already held stay,
 * the older ones join, each message once. The chat sorts by `createdAt`.
 */
export const withEarlier = (
  held: readonly ListMessageFragment[],
  earlier: readonly ListMessageFragment[],
): ListMessageFragment[] => {
  const known = new Set(held.map((message) => message.id));
  return [...held, ...earlier.filter((message) => !known.has(message.id))];
};

type RoomHistory = { hasEarlier: boolean; loading: boolean; loadEarlier: () => void };

const RoomHistoryContext = createContext<RoomHistory | null>(null);

/**
 * A room's conversation arrives a page at a time (the newest 50, `Room`
 * fragment); this reads the next older page into the room's cached
 * `GetRoom`, so the chat shows it like the rest.
 */
export const useRoomHistory = (room: { id: string; messageCount: number; messages: readonly unknown[] }): RoomHistory => {
  const client = useAlpaka();
  const [loading, setLoading] = useState(false);
  const held = room.messages.length;
  const loadEarlier = useCallback(() => {
    if (!client) return;
    setLoading(true);
    client
      .query<RoomMessagesQuery, RoomMessagesQueryVariables>({
        query: RoomMessagesDocument,
        variables: { id: room.id, offset: held, limit: EARLIER_PAGE },
        fetchPolicy: "network-only",
      })
      .then(({ data }) => {
        client.cache.updateQuery<GetRoomQuery>({ query: GetRoomDocument, variables: { id: room.id } }, (current) =>
          current ? { room: { ...current.room, messages: withEarlier(current.room.messages, data.room.earlier) } } : current,
        );
      })
      .catch(reportErrorAs("Couldn't load earlier messages"))
      .finally(() => setLoading(false));
  }, [client, room.id, held]);
  return { hasEarlier: room.messageCount > held, loading, loadEarlier };
};

/** Makes "Load earlier" of this room available to the chat list below it. */
export const RoomHistoryProvider = ({
  room,
  children,
}: {
  room: { id: string; messageCount: number; messages: readonly unknown[] };
  children: React.ReactNode;
}) => <RoomHistoryContext.Provider value={useRoomHistory(room)}>{children}</RoomHistoryContext.Provider>;

/** "Load earlier", at the top of a chat whose room has older messages; nothing otherwise. */
export const LoadEarlierMessages = () => {
  const history = useContext(RoomHistoryContext);
  if (!history?.hasEarlier) return null;
  return (
    <div className="flex justify-center">
      <Button variant="ghost" size="sm" className="text-xs" disabled={history.loading} onClick={history.loadEarlier}>
        Load earlier messages
      </Button>
    </div>
  );
};
