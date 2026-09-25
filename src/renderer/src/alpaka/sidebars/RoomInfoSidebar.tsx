import { Badge } from "@/core/components/ui/badge";
import Timestamp from "@/core/components/ui/timestamp";
import { Bot, MessageSquare, Users } from "lucide-react";
import { RoomFragment } from "../api/graphql";
import { agentDisplayName } from "../agentName";

type RoomAgent = RoomFragment["agents"][number];

/**
 * Everything about a room that is not its conversation — the counterpart of
 * the mikro Info rails, section for section. The room page has no Knowledge
 * or Chat tab (a room IS a chat, and nobody makes claims about one), so this
 * is the whole rail: when it was opened and by whom, which organization it
 * lives in, who is in it, and how much has been said.
 *
 * Everything here rides on the page's own `GetRoom` query and the message
 * subscription that feeds it, so the counts stay live without another round
 * trip.
 */
export const RoomInfoSidebar = ({ room }: { room: RoomFragment }) => {
  const participants = new Map<string, RoomAgent[]>();
  for (const agent of room.agents) {
    const list = participants.get(agent.user.id) ?? [];
    list.push(agent);
    participants.set(agent.user.id, list);
  }

  const lastMessage = room.messages.reduce<RoomFragment["messages"][number] | null>(
    (newest, message) =>
      !newest || Date.parse(String(message.createdAt)) > Date.parse(String(newest.createdAt))
        ? message
        : newest,
    null,
  );

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        <h2 className="break-words text-lg font-semibold">{room.title}</h2>
        {room.description ? (
          <p className="text-sm text-muted-foreground">{room.description}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground">No description</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Opened</div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">When</span>
          <span className="text-xs">
            <Timestamp date={room.createdAt} relative />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">By</span>
          {/* `creator` is nullable: rooms opened by a service have no user. */}
          <span className="font-mono text-xs">
            {room.creator?.preferredUsername ?? "Unknown"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Organization</div>
        <div className="break-all font-mono text-xs text-muted-foreground">
          {room.organization.slug}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Users className="h-3.5 w-3.5" />
          Participants
          <Badge variant="outline" className="ml-auto font-mono text-[0.625rem]">
            {participants.size}
          </Badge>
        </div>
        {participants.size === 0 ? (
          <p className="text-xs italic text-muted-foreground">Nobody has joined yet</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...participants.entries()].map(([userId, agents]) => (
              <li
                key={userId}
                className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
              >
                <div className="text-xs font-medium">
                  {agents[0].user.preferredUsername}
                </div>
                {/* One user can sit in a room through several agents (the
                    desktop app, a notebook, a bot). */}
                <ul className="mt-1 flex flex-col gap-0.5">
                  {agents.map((agent) => (
                    <li
                      key={agent.id}
                      className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
                    >
                      <Bot className="h-3 w-3 shrink-0" />
                      <span className="truncate">{agentDisplayName(agent)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <MessageSquare className="h-3.5 w-3.5" />
          Messages
          <Badge variant="outline" className="ml-auto font-mono text-[0.625rem]">
            {room.messages.length}
          </Badge>
        </div>
        {lastMessage && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Last</span>
            <span className="text-xs">
              <Timestamp date={lastMessage.createdAt} relative />
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Room Record</div>
        <div className="break-all font-mono text-xs text-muted-foreground">{room.id}</div>
      </div>
    </div>
  );
};
