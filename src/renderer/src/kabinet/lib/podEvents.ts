import type { WatchPodsSubscription } from "../api/graphql";

type PodEvent = WatchPodsSubscription["pods"];
export type EventPod = NonNullable<PodEvent["create"]>;

/**
 * Folds one pod event into a resource's pods. The stream is the whole
 * organization's, so membership is read off each pod's `resource`: a pod
 * scheduled onto this resource joins, one moved elsewhere leaves. An event
 * about another resource's pods hands back the same array, so the cache is
 * not rewritten for it.
 */
export const applyPodEvent = (resourceId: string, pods: EventPod[], event: PodEvent): EventPod[] => {
  const id = event.delete ?? (event.create ?? event.update)?.id;
  if (!id) return pods;
  const known = pods.some((existing) => existing.id === id);
  const pod = event.delete ? undefined : (event.create ?? event.update);

  if (!pod || pod.resource?.id !== resourceId) {
    return known ? pods.filter((existing) => existing.id !== id) : pods;
  }
  return known ? pods.map((existing) => (existing.id === id ? pod : existing)) : [...pods, pod];
};
