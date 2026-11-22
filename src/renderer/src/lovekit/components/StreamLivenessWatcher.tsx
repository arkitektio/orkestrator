import { useWatchStreamsSubscription } from "@/lovekit/api/graphql";

/**
 * Keeps "live" current everywhere without polling: lovekit announces a stream
 * going live or offline (its agent publishing, unpublishing or leaving). The
 * stream in the event carries its new `live`, which Apollo writes over the
 * cached one, and its agent's own `live` is dropped from the cache so every
 * mounted agent re-reads it. One subscription for the app, not one poll per
 * mounted display. A `background` builtin.
 */
export const StreamLivenessWatcher = () => {
  useWatchStreamsSubscription({
    onData: ({ data, client }) => {
      const stream = data.data?.streams.live ?? data.data?.streams.offline;
      if (!stream) return;
      const agent = client.cache.identify({ __typename: "Agent", id: stream.agent.id });
      if (agent && client.cache.evict({ id: agent, fieldName: "live" })) client.cache.gc();
    },
  });
  return null;
};
