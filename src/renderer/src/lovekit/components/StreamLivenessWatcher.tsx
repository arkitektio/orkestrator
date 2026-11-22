import { useWatchStreamsSubscription } from "@/lovekit/api/graphql";

/**
 * Keeps "live" current everywhere without polling: lovekit announces a stream
 * going live or offline (its agent publishing, unpublishing or leaving). The
 * stream in the event carries its new `live`, and its agent's `live` read at
 * the same moment; Apollo writes both over the cached ones, so every mounted
 * stream and agent shows it. One subscription for the app, not one poll per
 * mounted display. A `background` builtin.
 */
export const StreamLivenessWatcher = () => {
  useWatchStreamsSubscription();
  return null;
};
