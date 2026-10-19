import type { Identifier, Object } from "@/core/types";
import { useListStreamsQuery } from "@/lovekit/api/graphql";
import { AgentStreams } from "./AgentStreams";

/**
 * The streams of a rekuest agent, on its page (a `main` section of
 * `@rekuest/agent`): lovekit's agent is the same app instance (the same
 * client, user and organization), found by the client and user the page
 * hands over. Nothing when it offers none.
 */
export const AgentStreamsSection = ({ object }: { identifier: Identifier; object: Object }) => {
  const clientId = typeof object.clientId === "string" ? object.clientId : undefined;
  const userSub = typeof object.userSub === "string" ? object.userSub : undefined;
  const { data } = useListStreamsQuery({
    variables: { filter: { clientId, userSub } },
    skip: !clientId || !userSub,
    pollInterval: 15_000,
    fetchPolicy: "cache-and-network",
  });
  const streams = data?.streams ?? [];
  if (streams.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" data-testid="agent-streams">
      <h3 className="text-sm font-medium text-muted-foreground">Streams</h3>
      <AgentStreams streams={streams} />
    </section>
  );
};
