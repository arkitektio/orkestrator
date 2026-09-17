import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { ChatLayout } from "@/components/chat/chat-layout";
import { Sidebars } from "@/components/layout/Sidebars";
import { AlpakaRoom } from "@/linkers";
import { RoomInfoSidebar } from "../sidebars/RoomInfoSidebar";
import { useEffect } from "react";
import {
  WatchMessagesDocument,
  WatchMessagesSubscription,
  WatchMessagesSubscriptionVariables,
  useGetRoomQuery,
} from "../api/graphql";


export const RoomPage =  asDetailQueryRoute(
  useGetRoomQuery,
  ({ data, subscribeToMore }) => {
    useEffect(() => {
      return subscribeToMore<
        WatchMessagesSubscription,
        WatchMessagesSubscriptionVariables
      >({
        document: WatchMessagesDocument,
        variables: {
          room: data.room.id,
          agentId: "default",
        },
        updateQuery: (prev, options) => {
          const message = options.subscriptionData.data.room.message;
          if (!message) {
            return prev;
          }
          // A redelivered message must not duplicate in the room.
          if (prev.room.messages.some((existing) => existing.id === message.id)) {
            return prev;
          }
          return {
            room: {
              ...prev.room,
              messages: prev.room.messages.concat([message]),
            },
          };
        },
      });
    }, [data.room.id, subscribeToMore]);

    return (
      <AlpakaRoom.ModelPage
        title={data?.room?.title}
        object={data.room}
        pageActions={
          <div className="flex flex-row gap-2">
            <AlpakaRoom.ObjectButton object={data.room} />
          </div>
        }
        // A room is the conversation, so it gets no Knowledge or Chat tab —
        // just its own facts.
        chat={false}
        sidebars={
          <Sidebars sidebarKey="AlpakaRoom" defaultTab="Info">
            <Sidebars.Tab label="Info">
              <RoomInfoSidebar room={data.room} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="h-[calc(100vh)] min-h-0 flex flex-col overflow-hidden">
          <ChatLayout navCollapsedSize={200} room={data.room} />
        </div>
      </AlpakaRoom.ModelPage>
    );
  },
);


export default RoomPage;
